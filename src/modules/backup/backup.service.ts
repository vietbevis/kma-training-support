import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as archiver from 'archiver';
import { exec } from 'child_process';
import * as extract from 'extract-zip';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { Client } from 'minio';
import * as path from 'path';
import { BackupEntity } from 'src/database/entities/backup.entity';
import { InjectMinio } from 'src/shared/decorators/minio.decorator';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';
import { ConfigService } from 'src/shared/services/config.service';
import { DataSource, ILike, MoreThan, Repository } from 'typeorm';
import { promisify } from 'util';
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
    @InjectRepository(BackupEntity)
    private backupRepository: Repository<BackupEntity>,
    @InjectMinio() private readonly minioClient: Client,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.backupBucketName = this.configService.get('MINIO_BACKUP_BUCKET_NAME');
    this.mainBucketName = this.configService.get('MINIO_BUCKET_NAME');
    this.backupFolderPath = this.configService.get('BACKUP_FOLDER_PATH');
    this.initializeBackupSystem();
  }

  async createBackup(
    createBackupDto: CreateBackupDto,
    type: BackupType = BackupType.MANUAL,
  ): Promise<BackupEntity> {
    const backup = this.backupRepository.create({
      ...createBackupDto,
      type,
      status: BackupStatus.PENDING,
    });

    await this.backupRepository.save(backup);

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
    const backup = await this.backupRepository.findOne({
      where: { id: backupId },
    });
    if (!backup) return;

    try {
      await this.backupRepository.update(backupId, {
        status: BackupStatus.IN_PROGRESS,
      });

      // this.backupGateway.notifyBackupStatus(backupId, BackupStatus.IN_PROGRESS);

      // 1. Backup database
      const dbBackupPath = await this.backupDatabase();

      // 2. Backup files từ MinIO
      const filesBackupPath = await this.backupMinioFiles();

      // 3. Tạo file zip
      const zipPath = await this.createBackupArchive(
        dbBackupPath,
        filesBackupPath,
      );

      // 4. Upload lên MinIO
      const minioKey = await this.uploadToMinio(zipPath);

      // 5. Lấy thông tin file
      const stats = await fs.stat(zipPath);

      // 6. Cập nhật backup record
      await this.backupRepository.update(backupId, {
        status: BackupStatus.COMPLETED,
        fileSize: stats.size,
        filePath: zipPath,
        minioBucket: this.backupBucketName,
        minioObjectKey: minioKey,
        completedAt: new Date(),
      });

      // 7. Thông báo hoàn thành
      // this.backupGateway.notifyBackupComplete(backupId, {
      //   size: stats.size,
      //   downloadUrl: `/api/backup/${backupId}/download`,
      // });

      this.logger.log(`Backup completed successfully: ${backupId}`);
    } catch (error) {
      await this.backupRepository.update(backupId, {
        status: BackupStatus.FAILED,
        errorMessage: error.message,
      });

      // this.backupGateway.notifyBackupError(backupId, error.message);
      throw error;
    }
  }

  private async backupDatabase(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupFolderPath, filename);

    const dbConfig = {
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
    };

    const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${filepath}`;

    await execAsync(command, {
      env: { ...process.env, PGPASSWORD: dbConfig.password },
    });

    return filepath;
  }

  private async createBackupArchive(
    dbPath: string,
    filesPath?: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.zip`;
    const filepath = path.join(this.backupFolderPath, filename);

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

      // Thêm metadata
      const metadata = {
        createdAt: new Date(),
        databaseName: this.configService.get('DB_NAME'),
        version: '1.0.0',
      };
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
    const { page = 1, limit = 10, search } = query;
    const [data, total] = await this.backupRepository.findAndCount({
      where: {
        status: query.status,
        type: query.type,
        name: query.search ? ILike(`%${query.search}%`) : undefined,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
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

  async getBackupById(id: string): Promise<BackupEntity> {
    const backup = await this.backupRepository.findOne({ where: { id } });
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

    // Xóa file local
    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete local file: ${error.message}`);
      }
    }

    await this.backupRepository.delete(id);
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
      await this.backupRepository.update(backup.id, {
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

  private async backupMinioFiles(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `files-backup-${timestamp}.zip`;
    const filepath = path.join(this.backupFolderPath, filename);

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

      const oldBackups = await this.backupRepository.find({
        where: {
          createdAt: MoreThan(cutoffDate),
          status: BackupStatus.COMPLETED,
        },
      });

      for (const backup of oldBackups) {
        try {
          await this.deleteBackup(backup.id);
          this.logger.log(`✅ Đã xóa backup cũ: ${backup.name}`);
        } catch (error) {
          this.logger.warn(
            `⚠️ Không thể xóa backup ${backup.name}: ${error.message}`,
          );
        }
      }

      this.logger.log(`✅ Đã dọn dẹp ${oldBackups.length} backup cũ`);
    } catch (error) {
      this.logger.error('❌ Lỗi khi dọn dẹp backup cũ:', error);
    }
  }

  async validateBackup(id: string): Promise<boolean> {
    try {
      const backup = await this.getBackupById(id);

      if (backup.status !== BackupStatus.COMPLETED) {
        return false;
      }

      // Kiểm tra file tồn tại trên MinIO
      if (backup.minioObjectKey) {
        try {
          await this.minioClient.statObject(
            this.backupBucketName,
            backup.minioObjectKey,
          );
        } catch (error) {
          this.logger.error(`Backup file not found on MinIO: ${error.message}`);
          return false;
        }
      }

      // Tải và kiểm tra tính toàn vẹn của backup
      const tempPath = path.join(
        this.backupFolderPath,
        `validate-${backup.id}.zip`,
      );
      await this.minioClient.fGetObject(
        this.backupBucketName,
        backup.minioObjectKey,
        tempPath,
      );

      // Kiểm tra có thể giải nén được không
      const extractDir = path.resolve(
        path.join(this.backupFolderPath, `validate-extract-${backup.id}`),
      );
      await fs.mkdir(extractDir, { recursive: true });
      await extract(tempPath, { dir: extractDir });

      // Kiểm tra các file bắt buộc
      const requiredFiles = ['database.sql', 'metadata.json'];
      for (const file of requiredFiles) {
        const filePath = path.join(extractDir, file);
        await fs.access(filePath);
      }

      // Dọn dẹp
      await fs.rm(tempPath, { force: true });
      await fs.rm(extractDir, { recursive: true, force: true });

      this.logger.log(`✅ Backup ${backup.name} validation successful`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Backup validation failed: ${error.message}`);
      return false;
    }
  }

  async getBackupStatistics() {
    const [
      totalBackups,
      completedBackups,
      failedBackups,
      pendingBackups,
      manualBackups,
      scheduledBackups,
    ] = await Promise.all([
      this.backupRepository.count(),
      this.backupRepository.count({
        where: { status: BackupStatus.COMPLETED },
      }),
      this.backupRepository.count({ where: { status: BackupStatus.FAILED } }),
      this.backupRepository.count({ where: { status: BackupStatus.PENDING } }),
      this.backupRepository.count({ where: { type: BackupType.MANUAL } }),
      this.backupRepository.count({ where: { type: BackupType.SCHEDULED } }),
    ]);

    // Tính tổng dung lượng
    const backupsWithSize = await this.backupRepository.find({
      where: { status: BackupStatus.COMPLETED, fileSize: MoreThan(0) },
      select: ['fileSize'],
    });

    const totalSize = backupsWithSize.reduce(
      (sum, backup) => sum + (backup.fileSize || 0),
      0,
    );

    // Backup gần nhất
    const latestBackup = await this.backupRepository.findOne({
      where: { status: BackupStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    return {
      summary: {
        totalBackups,
        completedBackups,
        failedBackups,
        pendingBackups,
        manualBackups,
        scheduledBackups,
        totalSize,
        averageSize:
          completedBackups > 0 ? Math.round(totalSize / completedBackups) : 0,
      },
      latestBackup: latestBackup
        ? {
            id: latestBackup.id,
            name: latestBackup.name,
            completedAt: latestBackup.completedAt,
            fileSize: latestBackup.fileSize,
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
      const allBackups = await this.backupRepository.find({
        where: { status: BackupStatus.COMPLETED },
        order: { createdAt: 'ASC' },
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
}
