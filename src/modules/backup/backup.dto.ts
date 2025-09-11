import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';

export class CreateBackupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateBackupScheduleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  cron_expression: string;

  @IsOptional()
  retention_days?: number;

  @IsOptional()
  @IsObject()
  backup_options?: {
    include_files?: boolean;
    compress?: boolean;
    exclude_tables?: string[];
  };
}

export class UpdateBackupScheduleDto extends PartialType(
  CreateBackupScheduleDto,
) {
  @IsOptional()
  is_active?: boolean;
}

export class RestoreBackupDto {
  @IsString()
  backup_id: string;

  @IsOptional()
  @IsObject()
  restore_options?: {
    drop_existing?: boolean;
    restore_files?: boolean;
  };
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
