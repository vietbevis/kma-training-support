import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';
import { ConfigService } from 'src/shared/services/config.service';

// Interface để replace BackupEntity import
interface BackupEntity {
  id: string;
  name: string;
  description?: string;
  status: BackupStatus;
  type: BackupType;
  fileSize?: number;
  filePath?: string;
  minioBucket?: string;
  minioObjectKey?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  status: BackupStatus;
  type: BackupType;
  fileSize?: number;
  filePath?: string;
  minioBucket?: string;
  minioObjectKey?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface BackupMetadataStore {
  version: string;
  lastUpdated: Date;
  backups: BackupMetadata[];
}

@Injectable()
export class BackupMetadataService {
  private readonly logger = new Logger(BackupMetadataService.name);
  private readonly metadataFilePath: string;
  private readonly backupFolderPath: string;

  constructor(private readonly configService: ConfigService) {
    this.backupFolderPath = this.configService.get('BACKUP_FOLDER_PATH');
    this.metadataFilePath = path.join(
      this.backupFolderPath,
      'backup-metadata.json',
    );
    this.initializeMetadataFile();
  }

  private async initializeMetadataFile(): Promise<void> {
    try {
      // Đảm bảo thư mục backup tồn tại
      await fs.mkdir(this.backupFolderPath, { recursive: true });

      // Kiểm tra file metadata có tồn tại không
      try {
        await fs.access(this.metadataFilePath);
        this.logger.log('✅ Backup metadata file exists');
      } catch {
        // Tạo file metadata mới nếu chưa tồn tại
        const initialStore: BackupMetadataStore = {
          version: '1.0.0',
          lastUpdated: new Date(),
          backups: [],
        };
        await this.saveMetadataStore(initialStore);
        this.logger.log('✅ Created new backup metadata file');
      }
    } catch (error) {
      this.logger.error('❌ Error initializing backup metadata file:', error);
      throw new Error('Cannot initialize backup metadata system');
    }
  }

  private async loadMetadataStore(): Promise<BackupMetadataStore> {
    // if (this.cache) {
    //   return this.cache;
    // }

    try {
      const content = await fs.readFile(this.metadataFilePath, 'utf-8');
      const store = JSON.parse(content) as BackupMetadataStore;

      // Chuyển đổi date strings thành Date objects
      store.lastUpdated = new Date(store.lastUpdated);
      store.backups = store.backups.map((backup) => ({
        ...backup,
        createdAt: new Date(backup.createdAt),
        updatedAt: new Date(backup.updatedAt),
        completedAt: backup.completedAt
          ? new Date(backup.completedAt)
          : undefined,
      }));

      return store;
    } catch (error) {
      this.logger.error('❌ Error loading backup metadata:', error);
      // Return empty store if file is corrupted
      const emptyStore: BackupMetadataStore = {
        version: '1.0.0',
        lastUpdated: new Date(),
        backups: [],
      };
      await this.saveMetadataStore(emptyStore);
      return emptyStore;
    }
  }

  private async saveMetadataStore(store: BackupMetadataStore): Promise<void> {
    try {
      store.lastUpdated = new Date();
      const content = JSON.stringify(store, null, 2);
      await fs.writeFile(this.metadataFilePath, content, 'utf-8');
    } catch (error) {
      this.logger.error('❌ Error saving backup metadata:', error);
      throw new Error('Cannot save backup metadata');
    }
  }

  async createBackup(
    backupData: Partial<BackupEntity>,
  ): Promise<BackupMetadata> {
    const store = await this.loadMetadataStore();

    const backup: BackupMetadata = {
      id: backupData.id || crypto.randomUUID(),
      name: backupData.name || '',
      description: backupData.description,
      status: backupData.status || BackupStatus.PENDING,
      type: backupData.type || BackupType.MANUAL,
      fileSize: backupData.fileSize,
      filePath: backupData.filePath,
      minioBucket: backupData.minioBucket,
      minioObjectKey: backupData.minioObjectKey,
      errorMessage: backupData.errorMessage,
      metadata: backupData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: backupData.completedAt,
    };

    store.backups.push(backup);
    await this.saveMetadataStore(store);

    this.logger.log(`✅ Created backup metadata: ${backup.id}`);
    return backup;
  }

  async updateBackup(
    id: string,
    updateData: Partial<BackupMetadata>,
  ): Promise<BackupMetadata | null> {
    const store = await this.loadMetadataStore();
    const backupIndex = store.backups.findIndex((b) => b.id === id);

    if (backupIndex === -1) {
      this.logger.warn(`⚠️ Backup not found for update: ${id}`);
      return null;
    }

    store.backups[backupIndex] = {
      ...store.backups[backupIndex],
      ...updateData,
      updatedAt: new Date(),
    };

    await this.saveMetadataStore(store);

    this.logger.log(`✅ Updated backup metadata: ${id}`);
    return store.backups[backupIndex];
  }

  async findOne(id: string): Promise<BackupMetadata | null> {
    const store = await this.loadMetadataStore();
    return store.backups.find((b) => b.id === id) || null;
  }

  async findMany(
    options: {
      status?: BackupStatus;
      type?: BackupType;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: BackupMetadata[]; total: number }> {
    const store = await this.loadMetadataStore();
    let filteredBackups = [...store.backups];

    // Apply filters
    if (options.status) {
      filteredBackups = filteredBackups.filter(
        (b) => b.status === options.status,
      );
    }

    if (options.type) {
      filteredBackups = filteredBackups.filter((b) => b.type === options.type);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredBackups = filteredBackups.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          (b.description && b.description.toLowerCase().includes(searchLower)),
      );
    }

    // Sort by createdAt DESC
    filteredBackups.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = filteredBackups.length;

    // Apply pagination
    if (options.page && options.limit) {
      const skip = (options.page - 1) * options.limit;
      filteredBackups = filteredBackups.slice(skip, skip + options.limit);
    }

    return {
      data: filteredBackups,
      total,
    };
  }

  async deleteBackup(id: string): Promise<boolean> {
    const store = await this.loadMetadataStore();
    const initialLength = store.backups.length;

    store.backups = store.backups.filter((b) => b.id !== id);

    if (store.backups.length < initialLength) {
      await this.saveMetadataStore(store);
      this.logger.log(`✅ Deleted backup metadata: ${id}`);
      return true;
    }

    this.logger.warn(`⚠️ Backup not found for deletion: ${id}`);
    return false;
  }

  async count(
    options: {
      status?: BackupStatus;
      type?: BackupType;
    } = {},
  ): Promise<number> {
    const store = await this.loadMetadataStore();

    return store.backups.filter((backup) => {
      if (options.status && backup.status !== options.status) return false;
      if (options.type && backup.type !== options.type) return false;
      return true;
    }).length;
  }

  async getStatistics(): Promise<{
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    pendingBackups: number;
    manualBackups: number;
    scheduledBackups: number;
    totalSize: number;
    averageSize: number;
    latestBackup: BackupMetadata | null;
  }> {
    const store = await this.loadMetadataStore();

    const totalBackups = store.backups.length;
    const completedBackups = store.backups.filter(
      (b) => b.status === BackupStatus.COMPLETED,
    ).length;
    const failedBackups = store.backups.filter(
      (b) => b.status === BackupStatus.FAILED,
    ).length;
    const pendingBackups = store.backups.filter(
      (b) => b.status === BackupStatus.PENDING,
    ).length;
    const manualBackups = store.backups.filter(
      (b) => b.type === BackupType.MANUAL,
    ).length;
    const scheduledBackups = store.backups.filter(
      (b) => b.type === BackupType.SCHEDULED,
    ).length;

    const totalSize = store.backups
      .filter((b) => b.status === BackupStatus.COMPLETED && b.fileSize)
      .reduce((sum, b) => sum + (b.fileSize || 0), 0);

    const averageSize =
      completedBackups > 0 ? Math.round(totalSize / completedBackups) : 0;

    const latestBackup =
      store.backups
        .filter((b) => b.status === BackupStatus.COMPLETED)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ||
      null;

    return {
      totalBackups,
      completedBackups,
      failedBackups,
      pendingBackups,
      manualBackups,
      scheduledBackups,
      totalSize,
      averageSize,
      latestBackup,
    };
  }

  async rebuildFromBackupFiles(): Promise<{
    rebuiltCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let rebuiltCount = 0;

    try {
      // Scan backup directory for backup folders and files
      const items = await fs.readdir(this.backupFolderPath);

      // First scan for backup folders (new structure)
      const backupFolders: string[] = [];
      for (const item of items) {
        if (item.startsWith('backup-')) {
          const itemPath = path.join(this.backupFolderPath, item);
          const stats = await fs.stat(itemPath);
          if (stats.isDirectory()) {
            backupFolders.push(item);
          }
        }
      }

      this.logger.log(
        `🔄 Found ${backupFolders.length} backup folders to analyze`,
      );

      for (const folderName of backupFolders) {
        try {
          const folderPath = path.join(this.backupFolderPath, folderName);

          // Check for backup files in folder
          const folderItems = await fs.readdir(folderPath);
          const backupZip = folderItems.find(
            (f) => f.endsWith('.zip') && f.startsWith('backup-'),
          );
          const metadataFile = folderItems.find(
            (f) => f === 'backup-metadata.json',
          );

          if (!backupZip) continue;

          // Extract timestamp from folder name (backup-2023-01-01T12-00-00-000Z)
          const timestampMatch = folderName.match(/backup-(.+)$/);
          if (!timestampMatch) continue;

          const timestampStr = timestampMatch[1]
            .replace(/[-]/g, ':')
            .replace(/T/, 'T')
            .replace(/Z$/, 'Z');
          const createdAt = new Date(timestampStr);

          // Check if backup already exists in metadata
          const existingBackup = await this.findOne(folderName);
          if (existingBackup) continue;

          const zipPath = path.join(folderPath, backupZip);
          const zipStats = await fs.stat(zipPath);

          let backupMetadata: Record<string, any> = {};

          // Read metadata from folder if exists
          if (metadataFile) {
            try {
              const metadataContent = await fs.readFile(
                path.join(folderPath, metadataFile),
                'utf-8',
              );
              backupMetadata = JSON.parse(metadataContent);
            } catch (error: any) {
              this.logger.warn(
                `Failed to read metadata for ${folderName}: ${error.message}`,
              );
            }
          }

          // Create backup metadata entry
          await this.createBackup({
            id: folderName,
            name: `Recovered Backup ${createdAt.toLocaleDateString()}`,
            description: 'Backup recovered from backup folder',
            status: BackupStatus.COMPLETED,
            type: BackupType.MANUAL,
            fileSize: zipStats.size,
            filePath: zipPath,
            completedAt: createdAt,
            metadata: {
              ...backupMetadata,
              recovered: true,
              backupFolderPath: folderPath,
              backupFolderName: folderName,
            },
          });

          rebuiltCount++;
        } catch (error: any) {
          errors.push(
            `Failed to process folder ${folderName}: ${error.message}`,
          );
        }
      }

      // Also scan for old backup files (fallback for legacy backups)
      const zipFiles = items.filter(
        (f) => f.endsWith('.zip') && f.startsWith('backup-'),
      );

      this.logger.log(
        `🔄 Found ${zipFiles.length} legacy backup files to analyze`,
      );

      for (const zipFile of zipFiles) {
        try {
          const filePath = path.join(this.backupFolderPath, zipFile);
          const stats = await fs.stat(filePath);

          // Extract timestamp from filename (backup-2023-01-01T12-00-00-000Z.zip)
          const timestampMatch = zipFile.match(/backup-(.+)\.zip$/);
          if (!timestampMatch) continue;

          const timestampStr = timestampMatch[1]
            .replace(/[-]/g, ':')
            .replace(/T/, 'T')
            .replace(/Z$/, 'Z');
          const createdAt = new Date(timestampStr);

          // Check if backup already exists in metadata
          const backupId = zipFile.replace('.zip', '');
          const existingBackup = await this.findOne(backupId);
          if (existingBackup) continue;

          // Create backup metadata entry
          await this.createBackup({
            id: backupId,
            name: `Legacy Backup ${createdAt.toLocaleDateString()}`,
            description: 'Legacy backup recovered from file system',
            status: BackupStatus.COMPLETED,
            type: BackupType.MANUAL,
            fileSize: stats.size,
            filePath: filePath,
            completedAt: createdAt,
            metadata: {
              recovered: true,
              legacy: true,
              originalFilename: zipFile,
            },
          });

          rebuiltCount++;
        } catch (error: any) {
          errors.push(`Failed to process ${zipFile}: ${error.message}`);
        }
      }

      this.logger.log(`✅ Rebuilt ${rebuiltCount} backup metadata entries`);
      return { rebuiltCount, errors };
    } catch (error: any) {
      this.logger.error('❌ Error rebuilding backup metadata:', error);
      return { rebuiltCount: 0, errors: [error.message] };
    }
  }

  async exportToDatabase(): Promise<BackupMetadata[]> {
    const store = await this.loadMetadataStore();
    return store.backups;
  }

  async importFromDatabase(backups: BackupEntity[]): Promise<void> {
    const store = await this.loadMetadataStore();

    for (const backup of backups) {
      // Check if backup already exists
      const existingIndex = store.backups.findIndex((b) => b.id === backup.id);

      const backupMetadata: BackupMetadata = {
        id: backup.id,
        name: backup.name,
        description: backup.description,
        status: backup.status,
        type: backup.type,
        fileSize: backup.fileSize,
        filePath: backup.filePath,
        minioBucket: backup.minioBucket,
        minioObjectKey: backup.minioObjectKey,
        errorMessage: backup.errorMessage,
        metadata: backup.metadata,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
        completedAt: backup.completedAt,
      };

      if (existingIndex >= 0) {
        store.backups[existingIndex] = backupMetadata;
      } else {
        store.backups.push(backupMetadata);
      }
    }

    await this.saveMetadataStore(store);
    this.logger.log(
      `✅ Imported ${backups.length} backup metadata entries from database`,
    );
  }
}
