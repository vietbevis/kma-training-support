import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';

export class CreateBackupDto {
  // All fields are optional now
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RestoreFromUploadDto {
  // No name, description, or metadata required
  // Simplifying to just restore options
  @IsOptional()
  restoreOptions?: {
    dropExisting?: boolean;
    restoreFiles?: boolean;
  };
}

export class CreateBackupScheduleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  cronExpression: string;

  @IsOptional()
  retentionDays?: number;

  @IsOptional()
  @IsObject()
  backupOptions?: {
    includeFiles?: boolean;
    compress?: boolean;
    excludeTables?: string[];
  };
}

export class UpdateBackupScheduleDto extends PartialType(
  CreateBackupScheduleDto,
) {
  @IsOptional()
  isActive?: boolean;
}

export class RestoreBackupDto {
  @IsString()
  backupId: string;
}

export class QueryBackupDto {
  @IsOptional()
  @IsEnum(BackupStatus)
  status?: BackupStatus;

  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

export class BackupValidationResponseDto {
  valid: boolean;
  message: string;
}

export class BackupStatisticsDto {
  summary: {
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    pendingBackups: number;
    restoredBackups: number;
    manualBackups: number;
    scheduledBackups: number;
    totalSize: number;
    averageSize: number;
  };
  latestBackup: {
    id: string;
    name: string;
    completedAt: Date;
    fileSize: number;
  } | null;
}

export class ForceCleanupResponseDto {
  message: string;
  deletedCount: number;
  errors: string[];
}
