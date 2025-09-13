import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupMetadataService } from './backup-metadata.service';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BackupController],
  providers: [BackupService, BackupMetadataService],
  exports: [BackupService, BackupMetadataService],
})
export class BackupModule {}
