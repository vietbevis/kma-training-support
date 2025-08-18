import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from 'src/database/entities/audit-log.entity';
import { AuditContextInterceptor } from './audit-context.interceptor';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import {
  AuditConfig,
  AuditLogSubscriber,
} from './subscribers/audit-log.subscriber';
import { AuditableSubscriber } from './subscribers/auditable.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditableSubscriber,
    AuditLogSubscriber,
    AuditContextInterceptor,
  ],
  exports: [AuditLogService, AuditContextInterceptor],
})
export class AuditLogModule {
  static forRoot(config?: Partial<AuditConfig>): DynamicModule {
    return {
      module: AuditLogModule,
      imports: [TypeOrmModule.forFeature([AuditLogEntity])],
      controllers: [AuditLogController],
      providers: [
        {
          provide: 'AUDIT_CONFIG',
          useValue: config || {},
        },
        AuditLogService,
        AuditableSubscriber,
        AuditLogSubscriber,
        AuditContextInterceptor,
      ],
      exports: [AuditLogService, AuditContextInterceptor],
      global: true,
    };
  }
}
