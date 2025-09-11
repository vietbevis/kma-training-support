import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupEntity } from 'src/database/entities/backup.entity';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [TypeOrmModule.forFeature([BackupEntity]), ScheduleModule.forRoot()],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
