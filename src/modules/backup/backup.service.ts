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
import * as path from 'path';
import { InjectMinio } from 'src/shared/decorators/minio.decorator';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';
import { ConfigService } from 'src/shared/services/config.service';
import { promisify } from 'util';
import {
  BackupMetadata,
  BackupMetadataService,
} from './backup-metadata.service';
import {
  CreateBackupDto,
  QueryBackupDto,
  RestoreBackupDto,
} from './backup.dto';

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
  ) {
    this.backupBucketName = this.configService.get('MINIO_BACKUP_BUCKET_NAME');
    this.mainBucketName = this.configService.get('MINIO_BUCKET_NAME');
    this.backupFolderPath = this.configService.get('BACKUP_FOLDER_PATH');
    this.initializeBackupSystem();
  }

  async createBackup(
    createBackupDto: CreateBackupDto,
    type: BackupType = BackupType.MANUAL,
  ): Promise<any> {
    // Tạo backup metadata trong file system thay vì database
    const backup = await this.backupMetadataService.createBackup({
      id: crypto.randomUUID(),
      ...createBackupDto,
      type,
      status: BackupStatus.PENDING,
    });

    // Thực hiện backup bất đồng bộ
    this.performBackup(backup.id).catch((error) => {
      this.logger.error(`Backup failed for ${backup.id}:`, error);
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
        this.logger.warn(
          `⚠️ Main bucket "${this.mainBucketName}" không tồn tại`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi kiểm tra main bucket:', error);
    }
  }

  private async performBackup(backupId: string): Promise<void> {
    const backup = await this.backupMetadataService.findOne(backupId);
    if (!backup) return;

    try {
      await this.backupMetadataService.updateBackup(backupId, {
        status: BackupStatus.IN_PROGRESS,
      });

      // this.backupGateway.notifyBackupStatus(backupId, BackupStatus.IN_PROGRESS);

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
      // this.backupGateway.notifyBackupComplete(backupId, {
      //   size: stats.size,
      //   downloadUrl: `/api/backup/${backupId}/download`,
      // });

      this.logger.log(
        `✅ Backup thành công: ${backupId} - Folder: ${backupFolderName}`,
      );
    } catch (error) {
      await this.backupMetadataService.updateBackup(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error.message,
      });

      // this.backupGateway.notifyBackupError(backupId, error.message);
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

    // Exclude bảng tbl_backups để tránh việc backup metadata backup
    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database}  -f ${filepath}`;

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

  async restoreBackup(restoreDto: RestoreBackupDto): Promise<void> {
    const backup = await this.getBackupById(restoreDto.backup_id);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Cannot restore incomplete backup');
    }

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

      // 2. Giải nén
      const extractDir = path.resolve(
        path.join(this.backupFolderPath, `extract-${backup.id}`),
      );
      await fs.mkdir(extractDir, { recursive: true });
      await extract(tempPath, { dir: extractDir });

      // 3. Restore database
      const sqlFile = path.join(extractDir, 'database.sql');
      await this.restoreDatabase(
        sqlFile,
        restoreDto.restore_options?.drop_existing,
      );

      // 4. Restore files (nếu có)
      if (restoreDto.restore_options?.restore_files !== false) {
        await this.restoreMinioFiles(extractDir);
      }

      // 5. Cập nhật trạng thái
      await this.backupMetadataService.updateBackup(backup.id, {
        status: BackupStatus.RESTORED,
      });

      // 6. Dọn dẹp
      await fs.rm(tempPath, { force: true });
      await fs.rm(extractDir, { recursive: true, force: true });

      this.logger.log(
        `Restore completed successfully for backup: ${backup.id}`,
      );
    } catch (error) {
      this.logger.error(`Restore failed for backup ${backup.id}:`, error);
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

  private async restoreDatabase(
    sqlFile: string,
    dropExisting: boolean = false,
  ): Promise<void> {
    const dbConfig = {
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
    };

    const env = { ...process.env, PGPASSWORD: dbConfig.password };

    if (dropExisting) {
      // Ngắt kết nối tới DB (kill các session khác)
      const terminateCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbConfig.database}' AND pid <> pg_backend_pid();"`;
      await execAsync(terminateCommand, { env });

      // DROP database
      const dropCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbConfig.database}\\";"`;
      await execAsync(dropCommand, { env });

      // CREATE database
      const createCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d postgres -c "CREATE DATABASE \\"${dbConfig.database}\\";"`;
      await execAsync(createCommand, { env });
    }

    // Restore từ SQL file
    const restoreCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${sqlFile}`;
    await execAsync(restoreCommand, { env });
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
}
