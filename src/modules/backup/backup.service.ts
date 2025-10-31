import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as archiver from 'archiver';
import { exec } from 'child_process';
import * as extract from 'extract-zip';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { Client } from 'minio';
import { ClsService } from 'nestjs-cls';
import * as path from 'path';
import { InjectMinio } from 'src/shared/decorators/minio.decorator';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
import { ConfigService } from 'src/shared/services/config.service';
import { promisify } from 'util';
import {
  BackupMetadata,
  BackupMetadataService,
} from './backup-metadata.service';
import { CreateBackupDto, QueryBackupDto } from './backup.dto';
import { BackupGateway } from './backup.gateway';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupBucketName: string;
  private readonly mainBucketName: string;
  private readonly backupFolderPath: string;

  constructor(
    @InjectMinio() private readonly minioClient: Client,
    private readonly configService: ConfigService,
    private readonly backupMetadataService: BackupMetadataService,
    private readonly clsService: ClsService<MyClsStore>,
    private readonly backupGateway: BackupGateway,
  ) {
    this.backupBucketName = this.configService.get('MINIO_BACKUP_BUCKET_NAME');
    this.mainBucketName = this.configService.get('MINIO_BUCKET_NAME');
    this.backupFolderPath = this.configService.get('BACKUP_FOLDER_PATH');
    this.initializeBackupSystem();
  }

  async createBackup(
    createBackupDto: CreateBackupDto = {},
    type: BackupType = BackupType.MANUAL,
  ): Promise<any> {
    // Tạo backup metadata trong file system thay vì database
    // Generate default values if not provided
    const timestamp = new Date();
    const defaultName = `Backup ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;

    const userId = this.clsService.get('auditContext.user.id');

    const backup = await this.backupMetadataService.createBackup({
      id: crypto.randomUUID(),
      name: createBackupDto.name || defaultName,
      description: createBackupDto.description || 'System created backup',
      metadata: {
        ...(createBackupDto.metadata || {}),
        userId,
      },
      type,
      status: BackupStatus.PENDING,
    });

    // Notify user that backup has been initiated
    if (userId) {
      this.backupGateway.notifyBackupStatus(
        userId,
        backup.id,
        BackupStatus.PENDING,
      );
    }

    // Thực hiện backup bất đồng bộ
    this.performBackup(backup.id).catch((error) => {
      this.logger.error(`Backup failed for ${backup.id}:`, error);

      // Notify user about the error
      if (userId) {
        this.backupGateway.notifyBackupError(userId, backup.id, error.message);
      }
    });

    return backup;
  }

  private async initializeBackupSystem(): Promise<void> {
    // 1. Tạo thư mục backup
    try {
      await fs.mkdir(this.backupFolderPath, { recursive: true });
      this.logger.log(`✅ Thư mục backup đã được tạo thành công`);
    } catch (error) {
      this.logger.error('❌ Lỗi khi tạo thư mục backup:', error);
      throw new Error('Không thể tạo thư mục backup');
    }

    // 2. Tạo backup bucket trong MinIO
    try {
      const backupBucketExists = await this.minioClient.bucketExists(
        this.backupBucketName,
      );
      if (!backupBucketExists) {
        await this.minioClient.makeBucket(this.backupBucketName, 'us-east-1');
        this.logger.log(
          `✅ Backup bucket "${this.backupBucketName}" đã được tạo thành công`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi khởi tạo backup bucket:', error);
      throw new Error('Không thể khởi tạo backup bucket MinIO');
    }

    // 3. Kiểm tra main bucket tồn tại
    try {
      const mainBucketExists = await this.minioClient.bucketExists(
        this.mainBucketName,
      );
      if (!mainBucketExists) {
        await this.minioClient.makeBucket(this.mainBucketName, 'us-east-1');
        this.logger.log(
          `✅ Main bucket "${this.mainBucketName}" đã được tạo thành công`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi kiểm tra main bucket:', error);
    }
  }

  private async performBackup(backupId: string): Promise<void> {
    const backup = await this.backupMetadataService.findOne(backupId);
    if (!backup) return;

    const userId = backup.metadata?.userId;

    try {
      await this.backupMetadataService.updateBackup(backupId, {
        status: BackupStatus.IN_PROGRESS,
      });

      // Notify user that backup is in progress
      if (userId) {
        this.backupGateway.notifyBackupStatus(
          userId,
          backupId,
          BackupStatus.IN_PROGRESS,
        );
      }

      // 1. Tạo folder riêng cho backup này
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFolderName = `backup-${timestamp}`;
      const backupFolderPath = path.join(
        this.backupFolderPath,
        backupFolderName,
      );

      await fs.mkdir(backupFolderPath, { recursive: true });
      this.logger.log(`✅ Tạo backup folder: ${backupFolderName}`);

      // 2. Backup database
      const dbBackupPath = await this.backupDatabase(backupFolderPath);

      // 3. Backup files từ MinIO
      const filesBackupPath = await this.backupMinioFiles(backupFolderPath);

      // 4. Tạo file zip
      const zipPath = await this.createBackupArchive(
        dbBackupPath,
        filesBackupPath,
        backupFolderPath,
      );

      // 5. Upload lên MinIO
      const minioKey = await this.uploadToMinio(zipPath);

      // 6. Lấy thông tin file
      const stats = await fs.stat(zipPath);

      // 7. Cập nhật backup record
      await this.backupMetadataService.updateBackup(backupId, {
        status: BackupStatus.COMPLETED,
        fileSize: stats.size,
        filePath: zipPath,
        minioBucket: this.backupBucketName,
        minioObjectKey: minioKey,
        completedAt: new Date(),
        metadata: {
          ...backup.metadata,
          backupFolderPath,
          backupFolderName,
          timestamp,
        },
      });

      // 8. Thông báo hoàn thành
      if (userId) {
        this.backupGateway.notifyBackupComplete(userId, backupId, {
          size: stats.size,
          backupId,
        });
      }

      this.logger.log(
        `✅ Backup thành công: ${backupId} - Folder: ${backupFolderName}`,
      );
    } catch (error) {
      await this.backupMetadataService.updateBackup(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error.message,
      });

      if (userId) {
        this.backupGateway.notifyBackupError(userId, backupId, error.message);
      }
      throw error;
    }
  }

  private async backupDatabase(backupFolderPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.sql`;
    const filepath = path.join(backupFolderPath, filename);

    const dbConfig = {
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
    };

    const command = `pg_dump --verbose --host=${dbConfig.host} --port=${dbConfig.port} -U ${dbConfig.username} --format=c --no-acl --no-owner --create --file="${filepath}" ${dbConfig.database}`;

    await execAsync(command, {
      env: { ...process.env, PGPASSWORD: dbConfig.password },
    });

    this.logger.log(`✅ Database backup thành công: ${filename}`);
    return filepath;
  }

  private async createBackupArchive(
    dbPath: string,
    filesPath?: string,
    backupFolderPath?: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.zip`;
    const filepath = path.join(
      backupFolderPath || this.backupFolderPath,
      filename,
    );

    // Tạo metadata
    const metadata = {
      createdAt: new Date(),
      databaseName: this.configService.get('DB_NAME'),
      version: '1.0.0',
      backupFolderPath: backupFolderPath || this.backupFolderPath,
      files: {
        database: path.basename(dbPath),
        files: filesPath ? path.basename(filesPath) : null,
      },
    };

    // Lưu metadata vào file riêng trong backup folder
    if (backupFolderPath) {
      const metadataFilePath = path.join(
        backupFolderPath,
        'backup-metadata.json',
      );
      await fs.writeFile(
        metadataFilePath,
        JSON.stringify(metadata, null, 2),
        'utf-8',
      );
    }

    return new Promise((resolve, reject) => {
      const output = createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(filepath));
      archive.on('error', reject);
      archive.pipe(output);

      // Thêm database backup
      archive.file(dbPath, { name: 'database.sql' });

      // Thêm files backup nếu có
      if (filesPath) {
        archive.file(filesPath, { name: 'files.zip' });
      }

      // Thêm metadata vào archive
      archive.append(JSON.stringify(metadata, null, 2), {
        name: 'metadata.json',
      });

      archive.finalize();
    });
  }

  private async uploadToMinio(filepath: string): Promise<string> {
    const objectKey = `backups/${path.basename(filepath)}`;
    await this.minioClient.fPutObject(
      this.backupBucketName,
      objectKey,
      filepath,
    );
    return objectKey;
  }

  async getBackups(query: QueryBackupDto) {
    const { page = 1, limit = 10 } = query;

    const { data, total } = await this.backupMetadataService.findMany({
      status: query.status,
      type: query.type,
      search: query.search,
      page,
      limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBackupById(id: string): Promise<BackupMetadata> {
    const backup = await this.backupMetadataService.findOne(id);
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    return backup;
  }

  async deleteBackup(id: string): Promise<void> {
    const backup = await this.getBackupById(id);

    // Xóa file trên MinIO
    if (backup.minioObjectKey) {
      try {
        await this.minioClient.removeObject(
          this.backupBucketName,
          backup.minioObjectKey,
        );
      } catch (error) {
        this.logger.warn(`Failed to delete MinIO object: ${error.message}`);
      }
    }

    // Xóa toàn bộ backup folder nếu có
    if (backup.metadata?.backupFolderPath) {
      try {
        await fs.rm(backup.metadata.backupFolderPath, {
          recursive: true,
          force: true,
        });
        this.logger.log(
          `✅ Đã xóa backup folder: ${backup.metadata.backupFolderName}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to delete backup folder: ${error.message}`);
      }
    } else if (backup.filePath) {
      // Fallback: xóa file backup cũ nếu không có folder path
      try {
        await fs.unlink(backup.filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete local file: ${error.message}`);
      }
    }

    await this.backupMetadataService.deleteBackup(id);
  }

  async downloadBackup(
    id: string,
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string }> {
    const backup = await this.getBackupById(id);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Backup is not completed yet');
    }

    if (!backup.minioObjectKey) {
      throw new NotFoundException('Backup file not found');
    }

    const stream = await this.minioClient.getObject(
      this.backupBucketName,
      backup.minioObjectKey,
    );
    const filename = `${backup.name}-${backup.createdAt.toISOString().split('T')[0]}.zip`;

    return { stream, filename };
  }

  async restoreBackup(id: string): Promise<void> {
    const backup = await this.getBackupById(id);
    const userId = backup.metadata?.userId;

    // if (backup.status !== BackupStatus.COMPLETED) {
    //   throw new BadRequestException('Cannot restore incomplete backup');
    // }

    // Notify user that restore has started
    if (userId) {
      this.backupGateway.notifyBackupStatus(
        userId,
        backup.id,
        BackupStatus.IN_PROGRESS,
      );
    }

    // Thực hiện restore đồng bộ
    try {
      await this.performRestore(backup.id);
    } catch (error) {
      this.logger.error(`Restore failed for ${backup.id}:`, error);

      // Notify user about the error
      if (userId) {
        this.backupGateway.notifyBackupError(
          userId,
          backup.id,
          `Lỗi khôi phục: ${error.message}`,
        );
      }

      // Re-throw the error for the caller to handle
      throw error;
    }
  }

  private async performRestore(backupId: string): Promise<void> {
    const backup = await this.backupMetadataService.findOne(backupId);
    if (!backup) return;

    const userId = backup.metadata?.userId;

    try {
      // 1. Tải backup từ MinIO
      if (!backup.minioObjectKey) {
        throw new BadRequestException('Backup file not found on MinIO');
      }

      const tempPath = path.join(
        this.backupFolderPath,
        `temp-restore-${backup.id}.zip`,
      );
      await this.minioClient.fGetObject(
        this.backupBucketName,
        backup.minioObjectKey,
        tempPath,
      );

      this.logger.log(`✅ Đã tải backup từ MinIO: ${backup.minioObjectKey}`);

      // 2. Giải nén
      const extractDir = path.resolve(
        path.join(this.backupFolderPath, `extract-${backup.id}`),
      );
      await fs.mkdir(extractDir, { recursive: true });
      await extract(tempPath, { dir: extractDir });

      this.logger.log(`✅ Đã giải nén backup: ${extractDir}`);

      // 3. Restore database
      const sqlFile = path.join(extractDir, 'database.sql');
      await this.restoreDatabase(sqlFile);

      // 4. Restore files
      await this.restoreMinioFiles(extractDir);

      // 5. Cập nhật trạng thái
      // await this.backupMetadataService.updateBackup(backup.id, {
      //   status: BackupStatus.RESTORED,
      //   completedAt: new Date(),
      // });

      // Notify the user if a userId exists in metadata
      if (userId) {
        this.backupGateway.notifyBackupComplete(userId, backup.id, {
          message: 'Khôi phục thành công',
          timestamp: new Date(),
        });
      }

      // 6. Dọn dẹp
      await fs.rm(tempPath, { force: true });
      await fs.rm(extractDir, { recursive: true, force: true });

      this.logger.log(
        `✅ Restore completed successfully for backup: ${backup.id}`,
      );
    } catch (error) {
      // Cập nhật trạng thái thất bại
      await this.backupMetadataService.updateBackup(backup.id, {
        status: BackupStatus.FAILED,
        errorMessage: `Restore error: ${error.message}`,
      });

      if (userId) {
        this.backupGateway.notifyBackupError(
          userId,
          backup.id,
          `Lỗi khôi phục: ${error.message}`,
        );
      }

      this.logger.error(`❌ Restore failed for backup ${backup.id}:`, error);
      throw error;
    }
  }

  private async backupMinioFiles(backupFolderPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `files-backup-${timestamp}.zip`;
    const filepath = path.join(backupFolderPath, filename);

    // Lấy danh sách tất cả objects trong bucket trước
    const objectsList: any[] = [];
    const objectsStream = this.minioClient.listObjects(
      this.mainBucketName,
      '',
      true,
    );

    for await (const obj of objectsStream) {
      objectsList.push(obj);
    }

    this.logger.log(`Found ${objectsList.length} files to backup from MinIO`);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(filepath));
      archive.on('error', reject);
      archive.pipe(output);

      // Backup từng file
      const processFiles = async () => {
        try {
          for (const obj of objectsList) {
            try {
              const objectStream = await this.minioClient.getObject(
                this.mainBucketName,
                obj.name,
              );
              archive.append(objectStream, { name: obj.name });
            } catch (error) {
              this.logger.warn(
                `Failed to backup file ${obj.name}: ${error.message}`,
              );
            }
          }

          // Thêm metadata về files
          const filesMetadata = {
            totalFiles: objectsList.length,
            backedUpAt: new Date(),
            bucketName: this.mainBucketName,
            files: objectsList.map((obj) => ({
              name: obj.name,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
            })),
          };

          archive.append(JSON.stringify(filesMetadata, null, 2), {
            name: 'files-metadata.json',
          });

          archive.finalize();
        } catch (error) {
          reject(new Error(`Failed to backup files: ${error.message}`));
        }
      };

      processFiles();
    });
  }

  private async restoreMinioFiles(extractDir: string): Promise<void> {
    const filesZipPath = path.join(extractDir, 'files.zip');
    const filesExtractDir = path.resolve(path.join(extractDir, 'files'));

    try {
      // Kiểm tra có file backup files không
      await fs.access(filesZipPath);

      // Tạo thư mục đích và giải nén files backup
      await fs.mkdir(filesExtractDir, { recursive: true });
      await extract(filesZipPath, { dir: filesExtractDir });

      // Đọc metadata
      const metadataPath = path.join(filesExtractDir, 'files-metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      this.logger.log(`Restoring ${metadata.totalFiles} files to MinIO`);

      // Restore từng file
      for (const fileInfo of metadata.files) {
        try {
          const localFilePath = path.join(filesExtractDir, fileInfo.name);

          // Kiểm tra file có tồn tại không
          await fs.access(localFilePath);

          // Upload lại vào MinIO
          await this.minioClient.fPutObject(
            this.mainBucketName,
            fileInfo.name,
            localFilePath,
          );

          this.logger.log(`Restored file: ${fileInfo.name}`);
        } catch (error) {
          this.logger.warn(
            `Failed to restore file ${fileInfo.name}: ${error.message}`,
          );
        }
      }

      this.logger.log('Files restoration completed');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('No files backup found, skipping files restoration');
      } else {
        throw error;
      }
    }
  }

  private async restoreDatabase(sqlFile: string): Promise<void> {
    const dbConfig = {
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
    };

    const env = { ...process.env, PGPASSWORD: dbConfig.password };

    try {
      // Bước 1: Ngắt tất cả kết nối đến database target (bao gồm cả connection pools)
      const terminateCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "
      UPDATE pg_database SET datallowconn = 'false' WHERE datname = '${dbConfig.database}';
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${dbConfig.database}' AND pid <> pg_backend_pid();
    "`;

      this.logger.log('Terminating database connections...');
      await execAsync(terminateCommand, { env });

      // Bước 2: Đợi một chút để đảm bảo tất cả connections đã được terminate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Bước 3: Kiểm tra lại có còn connections nào không
      const checkConnectionsCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -t -c "
      SELECT count(*) FROM pg_stat_activity WHERE datname = '${dbConfig.database}';
    "`;

      const connectionResult = await execAsync(checkConnectionsCommand, {
        env,
      });
      const connectionCount = parseInt(connectionResult.stdout.trim());

      if (connectionCount > 0) {
        this.logger.warn(
          `Warning: Still ${connectionCount} connections to database. Forcing termination...`,
        );

        // Force terminate với retry
        for (let i = 0; i < 3; i++) {
          await execAsync(terminateCommand, { env });
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const recheckResult = await execAsync(checkConnectionsCommand, {
            env,
          });
          const recheckCount = parseInt(recheckResult.stdout.trim());

          if (recheckCount === 0) {
            this.logger.log('All connections terminated successfully');
            break;
          }

          if (i === 2) {
            this.logger.warn(
              'Warning: Some connections may still exist, proceeding anyway...',
            );
          }
        }
      }

      // Bước 4: DROP database với FORCE option (PostgreSQL 13+)
      this.logger.log('Dropping database...');
      const dropCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "
      DROP DATABASE IF EXISTS \\"${dbConfig.database}\\" WITH (FORCE);
    "`;

      try {
        await execAsync(dropCommand, { env });
      } catch (error) {
        // Fallback cho PostgreSQL versions cũ hơn (không support WITH FORCE)
        this.logger.warn('FORCE option not supported, trying without FORCE...');
        const dropCommandFallback = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbConfig.database}\\";`;
        await execAsync(dropCommandFallback, { env });
      }

      // Bước 5: CREATE database mới
      this.logger.log('Creating new database...');
      const createCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "CREATE DATABASE \\"${dbConfig.database}\\";"`;
      await execAsync(createCommand, { env });

      // Bước 6: Enable lại connections cho database
      const enableConnectionsCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = '${dbConfig.database}';"`;
      await execAsync(enableConnectionsCommand, { env });

      // Bước 7: RESTORE database từ file dump
      this.logger.log('Restoring database from dump file...');
      const restoreCommand = `pg_restore --verbose --host=${dbConfig.host} --port=${dbConfig.port} -U ${dbConfig.username} --clean --if-exists --no-owner --no-acl --format=c --dbname=${dbConfig.database} "${sqlFile}"`;
      await execAsync(restoreCommand, { env });

      this.logger.log('Database restore completed successfully');
    } catch (error) {
      this.logger.error('Error during database restore:', error);

      // Cleanup: Re-enable connections nếu có lỗi
      try {
        const enableConnectionsCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "UPDATE pg_database SET datallowconn = 'true' WHERE datname = '${dbConfig.database}';"`;
        await execAsync(enableConnectionsCommand, { env });
      } catch (cleanupError) {
        this.logger.error('Error during cleanup:', cleanupError);
      }

      throw error;
    }
  }

  // Scheduled backup - chạy hàng ngày lúc 2:00 AM
  @Cron('0 2 * * *')
  async handleScheduledBackup(): Promise<void> {
    try {
      this.logger.log('🔄 Bắt đầu backup tự động');

      const scheduledBackupDto: CreateBackupDto = {
        name: `Scheduled Backup ${new Date().toISOString().split('T')[0]}`,
        description: 'Automatic scheduled backup',
        metadata: {
          scheduledAt: new Date(),
          automatic: true,
        },
      };

      await this.createBackup(scheduledBackupDto, BackupType.SCHEDULED);
      this.logger.log('✅ Backup tự động đã được tạo thành công');
    } catch (error) {
      this.logger.error('❌ Lỗi backup tự động:', error);
    }
  }

  // Cleanup old backups - chạy hàng tuần
  @Cron('0 3 * * 0')
  async cleanupOldBackups(): Promise<void> {
    try {
      this.logger.log('🧹 Bắt đầu dọn dẹp backup cũ');

      const retentionDays = 30; // Giữ backup trong 30 ngày
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data: oldBackups } = await this.backupMetadataService.findMany({
        status: BackupStatus.COMPLETED,
      });

      // Filter backups older than cutoff date
      const filteredOldBackups = oldBackups.filter(
        (backup) => backup.createdAt < cutoffDate,
      );

      for (const backup of filteredOldBackups) {
        try {
          await this.deleteBackup(backup.id);
          this.logger.log(`✅ Đã xóa backup cũ: ${backup.name}`);
        } catch (error) {
          this.logger.warn(
            `⚠️ Không thể xóa backup ${backup.name}: ${error.message}`,
          );
        }
      }

      this.logger.log(`✅ Đã dọn dẹp ${filteredOldBackups.length} backup cũ`);
    } catch (error) {
      this.logger.error('❌ Lỗi khi dọn dẹp backup cũ:', error);
    }
  }

  async getBackupStatistics() {
    const statistics = await this.backupMetadataService.getStatistics();

    return {
      summary: {
        totalBackups: statistics.totalBackups,
        completedBackups: statistics.completedBackups,
        failedBackups: statistics.failedBackups,
        pendingBackups: statistics.pendingBackups,
        restoredBackups: statistics.restoredBackups,
        manualBackups: statistics.manualBackups,
        scheduledBackups: statistics.scheduledBackups,
        totalSize: statistics.totalSize,
        averageSize: statistics.averageSize,
      },
      latestBackup: statistics.latestBackup
        ? {
            id: statistics.latestBackup.id,
            name: statistics.latestBackup.name,
            completedAt: statistics.latestBackup.completedAt,
            fileSize: statistics.latestBackup.fileSize,
          }
        : null,
    };
  }

  async forceBackupCleanup(): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Lấy tất cả backup completed
      const { data: allBackups } = await this.backupMetadataService.findMany({
        status: BackupStatus.COMPLETED,
      });

      for (const backup of allBackups) {
        try {
          await this.deleteBackup(backup.id);
          deletedCount++;
        } catch (error) {
          errors.push(
            `Failed to delete backup ${backup.name}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      errors.push(`Failed to get backups: ${error.message}`);
    }

    return { deletedCount, errors };
  }

  // Thêm phương thức để rebuild metadata từ backup files có sẵn
  async rebuildBackupMetadata(): Promise<{
    rebuiltCount: number;
    errors: string[];
  }> {
    this.logger.log('🔄 Rebuilding backup metadata from existing files...');
    return await this.backupMetadataService.rebuildFromBackupFiles();
  }

  /**
   * Phương thức khôi phục từ file backup được upload
   * @param backupFile File backup được upload
   * @param restoreDto Các tùy chọn khôi phục
   */
  async restoreFromUploadedFile(
    backupFile: Express.Multer.File,
  ): Promise<BackupMetadata> {
    this.logger.log(`🔄 Bắt đầu khôi phục từ file backup được upload`);

    // 1. Tạo thư mục tạm thời để lưu file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempFolderName = `upload-restore-${timestamp}`;
    const tempFolderPath = path.resolve(
      path.join(this.backupFolderPath, tempFolderName),
    );

    await fs.mkdir(tempFolderPath, { recursive: true });

    // 2. Lưa file backup vào thư mục tạm thời
    const backupFilePath = path.resolve(
      path.join(tempFolderPath, backupFile.originalname),
    );
    await fs.writeFile(backupFilePath, backupFile.buffer);

    this.logger.log(`✅ Đã lưu file backup vào ${backupFilePath}`);

    // 3. Tạo folder để giải nén
    const extractDir = path.resolve(path.join(tempFolderPath, 'extracted'));
    await fs.mkdir(extractDir, { recursive: true });

    // 4. Giải nén file backup
    await extract(backupFilePath, { dir: extractDir });
    this.logger.log(`✅ Giải nén file backup thành công`);

    // 5. Kiểm tra file backup có đúng định dạng không
    try {
      // Kiểm tra file database.sql
      const sqlFilePath = path.resolve(path.join(extractDir, 'database.sql'));
      await fs.access(sqlFilePath);

      // Cố gắng đọc metadata nếu có
      let metadata: any = {};
      try {
        const metadataPath = path.resolve(
          path.join(extractDir, 'metadata.json'),
        );
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
        this.logger.log('✅ Đọc metadata từ file backup thành công');
      } catch (err) {
        this.logger.warn('⚠️ Không tìm thấy metadata trong file backup');
      }

      // 6. Lưu backup vào metadata
      const timestamp = new Date();
      const backupName = `Uploaded Backup ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
      const userId = this.clsService.get('auditContext.user.id');

      const backup = await this.backupMetadataService.createBackup({
        id: crypto.randomUUID(),
        name: backupName,
        description: 'Backup uploaded for restoration',
        status: BackupStatus.PENDING,
        type: BackupType.MANUAL,
        metadata: {
          ...metadata,
          uploaded: true,
          uploadedAt: timestamp,
          originalFilename: backupFile.originalname,
          tempFolderPath,
          userId,
        },
      });

      // Notify user that restore from upload has started
      if (userId) {
        this.backupGateway.notifyBackupStatus(
          userId,
          backup.id,
          BackupStatus.IN_PROGRESS,
        );
      }

      // Thực hiện restore đồng bộ
      try {
        await this.performRestoreFromUploadedFile(backup.id, backupFile);
      } catch (error) {
        this.logger.error(
          `Restore from upload failed for ${backup.id}:`,
          error,
        );

        // Re-throw the error for the caller to handle
        throw error;
      }

      return backup;
    } catch (error) {
      this.logger.error('❌ File backup không đúng định dạng:', error);
      throw new BadRequestException(
        'File backup không đúng định dạng hoặc bị hỏng. File phải chứa database.sql và tuân theo cấu trúc backup của hệ thống.',
      );
    }
  }

  private async performRestoreFromUploadedFile(
    backupId: string,
    backupFile: Express.Multer.File,
  ): Promise<void> {
    const backup = await this.backupMetadataService.findOne(backupId);
    if (!backup) return;

    const userId = backup.metadata?.userId;
    const tempFolderPath = backup.metadata?.tempFolderPath;

    try {
      if (!tempFolderPath) {
        throw new Error('Không tìm thấy thông tin temp folder path');
      }

      const extractDir = path.resolve(path.join(tempFolderPath, 'extracted'));

      // 1. Khôi phục database
      const sqlFilePath = path.resolve(path.join(extractDir, 'database.sql'));
      await this.restoreDatabase(sqlFilePath);

      this.logger.log(`✅ Đã khôi phục database từ uploaded backup`);

      // 2. Khôi phục files nếu được yêu cầu
      await this.restoreMinioFilesFromUpload(extractDir);

      // 3. Lưu file backup vào MinIO
      const minioKey = `backups/uploaded/${backupFile.originalname}`;
      await this.minioClient.putObject(
        this.backupBucketName,
        minioKey,
        backupFile.buffer,
      );

      // 4. Cập nhật thông tin backup metadata
      await this.backupMetadataService.updateBackup(backup.id, {
        status: BackupStatus.COMPLETED,
        minioBucket: this.backupBucketName,
        minioObjectKey: minioKey,
        fileSize: backupFile.size,
        completedAt: new Date(),
      });

      // 5. Notify user về thành công
      if (userId) {
        this.backupGateway.notifyBackupComplete(userId, backup.id, {
          message: 'Khôi phục từ file upload thành công',
          timestamp: new Date(),
        });
      }

      // 6. Dọn dẹp temp folder (tùy chọn, có thể giữ lại để debug)
      try {
        await fs.rm(tempFolderPath, { recursive: true, force: true });
        this.logger.log(`✅ Đã dọn dẹp temp folder: ${tempFolderPath}`);
      } catch (cleanupError) {
        this.logger.warn(
          `⚠️ Không thể dọn dẹp temp folder: ${cleanupError.message}`,
        );
      }

      this.logger.log(
        `✅ Khôi phục từ file backup thành công, ID: ${backup.id}`,
      );
    } catch (error) {
      // Cập nhật trạng thái thất bại
      await this.backupMetadataService.updateBackup(backup.id, {
        status: BackupStatus.FAILED,
        errorMessage: `Restore from upload error: ${error.message}`,
      });

      // Notify user về lỗi
      if (userId) {
        this.backupGateway.notifyBackupError(
          userId,
          backup.id,
          `Lỗi khôi phục từ file upload: ${error.message}`,
        );
      }

      this.logger.error(`❌ Khôi phục từ file backup thất bại:`, error);
      throw error;
    }
  }

  /**
   * Phương thức khôi phục files từ backup được upload
   */
  private async restoreMinioFilesFromUpload(extractDir: string): Promise<void> {
    const filesZipPath = path.resolve(path.join(extractDir, 'files.zip'));

    try {
      // Kiểm tra có file backup files không
      await fs.access(filesZipPath);

      // Tạo thư mục đích và giải nén files backup
      const filesExtractDir = path.resolve(path.join(extractDir, 'files'));
      await fs.mkdir(filesExtractDir, { recursive: true });
      await extract(filesZipPath, { dir: filesExtractDir });

      // Đọc metadata nếu có
      try {
        const metadataPath = path.resolve(
          path.join(filesExtractDir, 'files-metadata.json'),
        );
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        this.logger.log(
          `Restoring ${metadata.totalFiles || 'unknown number of'} files to MinIO`,
        );

        // Nếu có metadata, restore theo metadata
        if (metadata.files && Array.isArray(metadata.files)) {
          for (const fileInfo of metadata.files) {
            try {
              const localFilePath = path.resolve(
                path.join(filesExtractDir, fileInfo.name),
              );

              // Kiểm tra file có tồn tại không
              await fs.access(localFilePath);

              // Upload lại vào MinIO
              await this.minioClient.fPutObject(
                this.mainBucketName,
                fileInfo.name,
                localFilePath,
              );

              this.logger.log(`Restored file: ${fileInfo.name}`);
            } catch (error) {
              this.logger.warn(
                `Failed to restore file ${fileInfo.name}: ${error.message}`,
              );
            }
          }
        } else {
          // Không có danh sách files cụ thể, restore tất cả
          await this.restoreAllFilesInDirectory(filesExtractDir);
        }
      } catch (error) {
        // Không có metadata, restore tất cả files trong thư mục
        this.logger.warn('No files metadata found, restoring all files');
        await this.restoreAllFilesInDirectory(filesExtractDir);
      }

      this.logger.log('✅ Files restoration completed');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('No files backup found in uploaded backup');
      } else {
        this.logger.error('Error restoring files:', error);
      }
    }
  }

  /**
   * Khôi phục tất cả các files trong một thư mục lên MinIO
   */
  private async restoreAllFilesInDirectory(directory: string): Promise<void> {
    const processDirectory = async (dir: string, baseDir: string) => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await processDirectory(fullPath, baseDir);
        } else {
          // Tính toán path tương đối so với baseDir
          const relativePath = path.relative(baseDir, fullPath);
          // Chuyển đổi Windows path separator (\ sang /) nếu cần
          const objectKey = relativePath.replace(/\\/g, '/');

          try {
            await this.minioClient.fPutObject(
              this.mainBucketName,
              objectKey,
              fullPath,
            );
            this.logger.log(`Restored file: ${objectKey}`);
          } catch (error) {
            this.logger.warn(
              `Failed to restore file ${objectKey}: ${error.message}`,
            );
          }
        }
      }
    };

    await processDirectory(directory, directory);
  }
}
