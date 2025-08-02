import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import { HttpMethod } from 'src/shared/enums/http-method.enum';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
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
import { AuditableEntity } from '../../../database/base/auditable.entity';
import {
  AuditAction,
  AuditLogEntity,
  AuditStatus,
} from '../../../database/entities/audit-log.entity';

export interface AuditContext {
  userId?: string;
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

  async afterInsert(event: InsertEvent<AuditableEntity>): Promise<void> {
    this.logger.log('afterInsert', event.entityId);
    // try {
    //   const context = this.getAuditContext();
    //   const config = this.getAuditConfig(event.entity);

    //   const auditLog = this.createAuditLog({
    //     action: AuditAction.CREATE,
    //     entityName: event.metadata.tableName,
    //     entityId: this.getEntityId(event.entity),
    //     newValues: this.sanitizeValues(event.entity, config),
    //     context,
    //     config,
    //   });

    //   await this.saveAudit(auditLog, config);
    // } catch (error) {
    //   this.logger.error('Error in afterInsert audit:', error);
    // }
  }

  async afterUpdate(event: UpdateEvent<AuditableEntity>): Promise<void> {
    this.logger.log('afterUpdate', event.databaseEntity.id);
    // try {
    //   const context = this.getAuditContext();
    //   const config = this.getAuditConfig(event.entity);

    //   const oldValues = event.databaseEntity || {};
    //   const newValues = event.entity || {};

    //   const changedFields = this.getChangedFields(oldValues, newValues, config);

    //   if (changedFields.length === 0) return;

    //   const auditLog = this.createAuditLog({
    //     action: AuditAction.UPDATE,
    //     entityName: event.metadata.tableName,
    //     entityId: this.getEntityId(event.entity),
    //     oldValues: this.sanitizeValues(oldValues, config),
    //     newValues: this.sanitizeValues(newValues, config),
    //     changedFields,
    //     context,
    //     config,
    //   });

    //   await this.saveAudit(auditLog, config);
    // } catch (error) {
    //   this.logger.error('Error in afterUpdate audit:', error);
    // }
  }

  async afterRemove(event: RemoveEvent<AuditableEntity>): Promise<void> {
    this.logger.log('afterRemove', event.entityId);
    // try {
    //   const context = this.getAuditContext();
    //   const config = this.getAuditConfig(event.entity);

    //   const auditLog = this.createAuditLog({
    //     action: AuditAction.DELETE,
    //     entityName: event.metadata.tableName,
    //     entityId: this.getEntityId(event.entity || event.databaseEntity),
    //     oldValues: this.sanitizeValues(
    //       event.entity || event.databaseEntity,
    //       config,
    //     ),
    //     context,
    //     config,
    //   });

    //   await this.saveAudit(auditLog, config);
    // } catch (error) {
    //   this.logger.error('Error in afterRemove audit:', error);
    // }
  }

  async afterSoftRemove(
    event: SoftRemoveEvent<AuditableEntity>,
  ): Promise<void> {
    this.logger.log('afterSoftRemove', event.entityId);
    // try {
    //   const context = this.getAuditContext();
    //   const config = this.getAuditConfig(event.entity);

    //   const auditLog = this.createAuditLog({
    //     action: AuditAction.SOFT_DELETE,
    //     entityName: event.metadata.tableName,
    //     entityId: this.getEntityId(event.entity),
    //     oldValues: this.sanitizeValues(event.databaseEntity, config),
    //     newValues: this.sanitizeValues(event.entity, config),
    //     context,
    //     config,
    //   });

    //   await this.saveAudit(auditLog, config);
    // } catch (error) {
    //   this.logger.error('Error in afterSoftRemove audit:', error);
    // }
  }

  async afterRecover(event: RecoverEvent<AuditableEntity>): Promise<void> {
    this.logger.log('afterRecover', event.entityId);
    // try {
    //   const context = this.getAuditContext();
    //   const config = this.getAuditConfig(event.entity);

    //   const auditLog = this.createAuditLog({
    //     action: AuditAction.RESTORE,
    //     entityName: event.metadata.tableName,
    //     entityId: String(event.entity.id),
    //     oldValues: this.sanitizeValues(event.databaseEntity, config),
    //     newValues: this.sanitizeValues(event.entity, config),
    //     context,
    //     config,
    //   });

    //   await this.saveAudit(auditLog, config);
    // } catch (error) {
    //   this.logger.error('Error in afterRecover audit:', error);
    // }
  }

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
      userId: context.userId,
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
