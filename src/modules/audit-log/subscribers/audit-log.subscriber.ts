import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { AuditableEntity } from 'src/database/base/auditable.entity';
import {
  AuditAction,
  AuditLogEntity,
  AuditStatus,
} from 'src/database/entities/audit-log.entity';
import { HttpMethod } from 'src/shared/enums/http-method.enum';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
import { IRequest } from 'src/shared/types';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RecoverEvent,
  RemoveEvent,
  Repository,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';

export interface AuditContext {
  user?: IRequest['user'];
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  httpMethod?: string;
  endpoint?: string;
  metadata?: any;
}

export interface AuditConfig {
  enabled?: boolean;
  excludeFields?: string[];
  includeFields?: string[];
  sensitiveFields?: string[];
  trackOldValues?: boolean;
  trackNewValues?: boolean;
  async?: boolean;
  batchSize?: number;
}

@Injectable()
@EventSubscriber()
export class AuditLogSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditLogSubscriber.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepository: Repository<AuditLogEntity>,
    private clsService: ClsService<MyClsStore>,
    private readonly dataSource: DataSource,
  ) {
    this.logger.log('AuditLogSubscriber initialized');
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return AuditableEntity;
  }

  async afterInsert(event: InsertEvent<AuditableEntity>): Promise<void> {}

  async afterUpdate(event: UpdateEvent<AuditableEntity>): Promise<void> {}

  async afterRemove(event: RemoveEvent<AuditableEntity>): Promise<void> {}

  async afterSoftRemove(
    event: SoftRemoveEvent<AuditableEntity>,
  ): Promise<void> {}

  async afterRecover(event: RecoverEvent<AuditableEntity>): Promise<void> {}

  private createAuditLog(params: {
    action: AuditAction;
    entityName: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    changedFields?: string[];
  }): AuditLogEntity {
    const {
      action,
      entityName,
      entityId,
      oldValues,
      newValues,
      changedFields,
    } = params;

    const context = this.clsService.get('auditContext') || {};

    const auditLog = this.auditRepository.create({
      action,
      entityName,
      entityId,
      status: AuditStatus.SUCCESS,
      userId: context.user?.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      httpMethod: context.httpMethod as HttpMethod,
      endpoint: context.endpoint,
      oldValues: oldValues,
      newValues: newValues,
      changedFields: changedFields,
      metadata: context.metadata,
      description: this.generateDescription(action, entityName, changedFields),
    });

    return auditLog;
  }

  private generateDescription(
    action: AuditAction,
    entityName: string,
    changedFields?: string[],
  ): string {
    switch (action) {
      case AuditAction.CREATE:
        return `Thêm mới ${entityName}`;
      case AuditAction.UPDATE:
        return `Cập nhật ${entityName} - Các trường thay đổi: ${changedFields?.join(', ') || 'Không có trường thay đổi'}`;
      case AuditAction.DELETE:
        return `Xóa ${entityName}`;
      case AuditAction.SOFT_DELETE:
        return `Xóa mềm ${entityName}`;
      case AuditAction.RESTORE:
        return `Khôi phục ${entityName} từ xóa mềm`;
      default:
        return `Thực hiện ${action} trên ${entityName}`;
    }
  }

  private getChangedFields(
    oldValues: any,
    newValues: any,
    config: AuditConfig,
  ): string[] {
    const changedFields: string[] = [];
    const excludeFields = config.excludeFields || [];

    if (!oldValues || !newValues) return changedFields;

    for (const key in newValues) {
      if (excludeFields.includes(key)) continue;

      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (!this.isEqual(oldValue, newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  private isEqual(val1: any, val2: any): boolean {
    if (val1 === val2) return true;

    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() === val2.getTime();
    }

    if (typeof val1 === 'object' && typeof val2 === 'object') {
      return JSON.stringify(val1) === JSON.stringify(val2);
    }

    return false;
  }

  private sanitizeValues(values: any, config: AuditConfig): any {
    if (!values || typeof values !== 'object') return values;

    const sanitized = { ...values };
    const sensitiveFields = config.sensitiveFields || [];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  onApplicationShutdown(): void {
    this.logger.log('onApplicationShutdown');
  }
}
