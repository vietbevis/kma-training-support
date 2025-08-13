import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import {
  AuditAction,
  AuditLogEntity,
  AuditStatus,
} from 'src/database/entities/audit-log.entity';
import { HttpMethod } from 'src/shared/enums/http-method.enum';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
import { Repository } from 'typeorm';
import {
  AuditLogResponseDto,
  GetAuditLogsResponseDto,
  GetAuditStatsResponseDto,
  PaginationMetaDto,
} from './audit-log.dto';
import {
  ENTITY_NAME_MAPPING,
  EXCLUDED_ENTITIES,
  isEntityExcluded,
} from './subscribers/audit-log.subscriber';

export interface ManualAuditLogParams {
  action: AuditAction;
  entityName: string;
  entityId?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  metadata?: any;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepository: Repository<AuditLogEntity>,
    private clsService: ClsService<MyClsStore>,
  ) {}

  /**
   * Tạo audit log thủ công cho các hành động đặc biệt
   */
  async createManualAuditLog(params: ManualAuditLogParams): Promise<void> {
    try {
      const context = this.clsService.get('auditContext') || {};
      const currentUser = context.user;

      const vietnameseEntityName =
        ENTITY_NAME_MAPPING[params.entityName] || params.entityName;

      let description = params.description;
      if (!description) {
        const userInfo = currentUser
          ? ` bởi ${currentUser.fullName || currentUser.username}`
          : '';
        description = `${this.getActionDescription(params.action)} ${vietnameseEntityName}${userInfo}`;
      }

      const auditLog = this.auditRepository.create({
        action: params.action,
        entityName: params.entityName,
        entityId: params.entityId,
        status: AuditStatus.SUCCESS,
        userId: currentUser?.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        httpMethod: context.httpMethod as HttpMethod,
        endpoint: context.endpoint,
        oldValues: params.oldValues,
        newValues: params.newValues,
        changedFields: params.changedFields,
        metadata: params.metadata,
        description,
      });

      await this.auditRepository.save(auditLog);
      this.logger.log(
        `Manual audit log created: ${params.action} on ${params.entityName}`,
      );
    } catch (error) {
      this.logger.error('Error creating manual audit log', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách audit logs với phân trang và lọc
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    entityName?: string;
    action?: AuditAction;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
    facultyDepartmentId?: string;
  }): Promise<GetAuditLogsResponseDto> {
    const {
      page = 1,
      limit = 50,
      entityName,
      action,
      userId,
      fromDate,
      toDate,
      facultyDepartmentId,
    } = params;

    const query = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('user.facultyDepartment', 'facultyDepartment');

    if (entityName) {
      query.andWhere('audit.entityName = :entityName', { entityName });
    }

    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }

    if (fromDate) {
      query.andWhere('audit.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('audit.createdAt <= :toDate', { toDate });
    }

    if (facultyDepartmentId) {
      query.andWhere('user.facultyDepartmentId = :facultyDepartmentId', {
        facultyDepartmentId,
      });
    }

    const [items, total] = await query
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Transform to response DTO
    const transformedData: AuditLogResponseDto[] = items.map((item) => ({
      id: item.id,
      action: item.action,
      entityName: item.entityName,
      entityId: item.entityId,
      status: item.status,
      user: item.user ? this.transformUserToSummary(item.user) : undefined,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      httpMethod: item.httpMethod,
      endpoint: item.endpoint,
      oldValues: item.oldValues,
      newValues: item.newValues,
      changedFields: item.changedFields,
      description: item.description,
      errorMessage: item.errorMessage,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const meta: PaginationMetaDto = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return {
      data: transformedData,
      meta,
    };
  }

  /**
   * Lấy audit log chi tiết theo ID
   */
  async getAuditLogById(id: string): Promise<AuditLogEntity | null> {
    return this.auditRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  /**
   * Transform User entity thành UserSummaryDto
   */
  private transformUserToSummary(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      code: user.code,
      email: user.email,
      position: user.position,
      facultyDepartment: user.facultyDepartment
        ? {
            id: user.facultyDepartment.id,
            name: user.facultyDepartment.name,
            code: user.facultyDepartment.code,
          }
        : null,
    };
  }

  /**
   * Lấy thống kê audit logs
   */
  async getAuditStats(params: {
    fromDate?: Date;
    toDate?: Date;
  }): Promise<GetAuditStatsResponseDto> {
    const { fromDate, toDate } = params;

    const query = this.auditRepository.createQueryBuilder('audit');

    if (fromDate) {
      query.andWhere('audit.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('audit.createdAt <= :toDate', { toDate });
    }

    const [actionStats, entityStats, userStats] = await Promise.all([
      // Thống kê theo action
      query
        .select('audit.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.action')
        .getRawMany(),

      // Thống kê theo entity
      query
        .select('audit.entityName', 'entityName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.entityName')
        .getRawMany(),

      // Thống kê theo user
      query
        .select('audit.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.userId')
        .getRawMany(),
    ]);

    return {
      actionStats: actionStats.map((stat) => ({
        action: stat.action,
        count: parseInt(stat.count),
      })),
      entityStats: entityStats.map((stat) => ({
        entityName: stat.entityName,
        vietnameseName: ENTITY_NAME_MAPPING[stat.entityName] || stat.entityName,
        count: parseInt(stat.count),
      })),
      userStats: userStats.map((stat) => ({
        userId: stat.userId,
        count: parseInt(stat.count),
      })),
    };
  }

  /**
   * Lấy danh sách entities bị loại trừ khỏi audit log
   */
  getExcludedEntities(): string[] {
    return [...EXCLUDED_ENTITIES];
  }

  /**
   * Kiểm tra entity có bị loại trừ hay không
   */
  isEntityExcluded(entityName: string): boolean {
    return isEntityExcluded(entityName);
  }

  /**
   * Thêm entity vào danh sách loại trừ (runtime)
   */
  addExcludedEntity(entityName: string): void {
    if (!EXCLUDED_ENTITIES.has(entityName)) {
      EXCLUDED_ENTITIES.add(entityName);
      this.logger.log(`Added ${entityName} to excluded entities list`);
    }
  }

  /**
   * Xóa entity khỏi danh sách loại trừ (runtime)
   */
  removeExcludedEntity(entityName: string): void {
    if (EXCLUDED_ENTITIES.has(entityName)) {
      EXCLUDED_ENTITIES.delete(entityName);
      this.logger.log(`Removed ${entityName} from excluded entities list`);
    }
  }

  private getActionDescription(action: AuditAction): string {
    switch (action) {
      case AuditAction.CREATE:
        return 'Thêm mới';
      case AuditAction.UPDATE:
        return 'Cập nhật';
      case AuditAction.DELETE:
        return 'Xóa';
      case AuditAction.SOFT_DELETE:
        return 'Xóa mềm';
      case AuditAction.RESTORE:
        return 'Khôi phục';
      case AuditAction.LOGIN:
        return 'Đăng nhập';
      case AuditAction.LOGOUT:
        return 'Đăng xuất';
      case AuditAction.EXPORT:
        return 'Xuất dữ liệu';
      case AuditAction.IMPORT:
        return 'Nhập dữ liệu';
      case AuditAction.VIEW:
        return 'Xem';
      case AuditAction.DOWNLOAD:
        return 'Tải xuống';
      case AuditAction.UPLOAD:
        return 'Tải lên';
      default:
        return action;
    }
  }
}
