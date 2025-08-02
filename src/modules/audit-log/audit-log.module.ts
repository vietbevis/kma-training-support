import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from 'src/database/entities/audit-log.entity';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogSubscriber } from './subscribers/audit-log.subscriber';
import { AuditableSubscriber } from './subscribers/auditable.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditableSubscriber, AuditLogSubscriber],
})
export class AuditLogModule {}
