import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
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
  In,
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
  maxDescriptionLength?: number;
  maxFieldsToShow?: number;
  flushInterval?: number;
}

interface AuditLogParams {
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  metadata?: any;
  error?: string;
  context?: AuditContext;
}

// Mapping tên entities sang tiếng Việt
export const ENTITY_NAME_MAPPING: Record<string, string> = {
  // Quản lý người dùng
  UserEntity: 'Nhân viên',
  RoleEntity: 'Vai trò',
  PermissionEntity: 'Quyền hạn',

  // Học thuật
  AcademicCredentialsEntity: 'Học hàm học vị',
  AcademicYearEntity: 'Năm học',
  CourseEntity: 'Khóa học',
  EducationalSystemEntity: 'Hệ đào tạo',
  SubjectEntity: 'Môn học',
  StandardLectureHoursEntity: 'Giờ chuẩn giảng dạy',
  LectureInvitationMoneyEntity: 'Tiền mời giảng',
  ExemptionPercentageEntity: 'Phần trăm miễn giảm',

  // Cơ sở vật chất
  BuildingEntity: 'Tòa nhà',
  ClassroomEntity: 'Phòng học',
  FacultyDepartmentEntity: 'Khoa/Phòng ban',

  // Hệ thống
  RefreshTokenEntity: 'Token làm mới',
  AuditLogEntity: 'Nhật ký kiểm toán',
};

// Mapping tên fields sang tiếng Việt
export const FIELD_NAME_MAPPING: Record<string, string> = {
  // Thông tin cá nhân
  fullName: 'Họ và tên',
  code: 'Mã',
  username: 'Tên đăng nhập',
  password: 'Mật khẩu',
  email: 'Địa chỉ email',
  phone: 'Số điện thoại',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  workPlace: 'Nơi công tác',
  position: 'Chức vụ',
  salary: 'Lương',
  salaryCoefficient: 'Hệ số lương',
  areTeaching: 'Tình trạng giảng dạy',

  // Thông tin định danh
  citizenId: 'Căn cước công dân',
  citizenIdIssueDate: 'Ngày cấp CCCD',
  citizenIdIssuePlace: 'Nơi cấp CCCD',
  citizenIdFront: 'Ảnh CCCD trước',
  citizenIdBack: 'Ảnh CCCD sau',
  citizenIdAddress: 'Địa chỉ trên CCCD',
  currentAddress: 'Địa chỉ hiện tại',

  // Thông tin ngân hàng
  bankAccount: 'Số tài khoản',
  bankName: 'Tên ngân hàng',
  bankBranch: 'Chi nhánh ngân hàng',
  taxCode: 'Mã số thuế',

  // Tệp tin
  profileFile: 'Tệp lí lịch cá nhân',

  // Vai trò và quyền
  name: 'Tên',
  description: 'Mô tả',
  isActive: 'Hoạt động',
  isSystemRole: 'Vai trò hệ thống',
  scopeFacultyDepartmentId: 'Phạm vi khoa/phòng ban',
  permissions: 'Quyền hạn',
  roles: 'Vai trò',

  // API và HTTP
  path: 'Đường dẫn API',
  method: 'Phương thức HTTP',
  module: 'Module',

  // Học thuật
  yearCode: 'Mã năm học',
  courseCode: 'Mã khóa học',
  courseName: 'Tên khóa học',
  credits: 'Số tín chỉ',
  semester: 'Học kỳ',
  subjectCode: 'Mã môn học',
  subjectName: 'Tên môn học',
  facultyDepartmentId: 'Khoa/phòng ban',
  subjectId: 'Bộ môn',
  academicCredentialId: 'Học hàm học vị',
  headOfDepartmentId: 'Trưởng bộ môn',

  // Hệ đào tạo
  nameClass: 'Tên lớp',
  educationLevels: 'Trình độ đào tạo',
  tuitions: 'Học phí',
  studentCategory: 'Danh mục sinh viên',

  // Giờ chuẩn giảng dạy
  lectureHours: 'Số tiết giảng dạy',
  excessHours: 'Số tiết vượt giờ',
  researchHours: 'Số tiết NCKH',

  // Tiền mời giảng
  money: 'Số tiền',
  educationalSystem: 'Hệ đào tạo',

  // Phần trăm miễn giảm
  exemptionPercentageId: 'Phần trăm miễn giảm',
  percentage: 'Phần trăm',
  reason: 'Lý do',

  // Cơ sở vật chất
  buildingId: 'Tòa nhà',
  type: 'Loại phòng học',

  // Token
  token: 'Token',
  userId: 'Nhân viên',
  expiresAt: 'Thời gian hết hạn',
  isRevoked: 'Đã bị thu hồi',
  ipAddress: 'Địa chỉ IP',
  userAgent: 'User Agent',

  // Audit log
  action: 'Hành động',
  entityName: 'Tên entity',
  entityId: 'ID entity',
  oldValues: 'Giá trị cũ',
  newValues: 'Giá trị mới',
  changedFields: 'Các trường thay đổi',
  httpMethod: 'Phương thức HTTP',
  endpoint: 'Endpoint',
  requestParams: 'Tham số request',
  requestBody: 'Body request',
  responseStatus: 'Status response',
  responseTime: 'Thời gian xử lý',
  status: 'Trạng thái',
  errorMessage: 'Thông báo lỗi',
  errorStack: 'Stack trace lỗi',
  metadata: 'Metadata',

  // Trạng thái và thời gian
  isDeleted: 'Đã xóa',
  isFaculty: 'Là khoa',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  deletedAt: 'Ngày xóa',
  createdById: 'Người tạo',
  updatedById: 'Người cập nhật',
  deletedById: 'Người xóa',
};

// Mapping relation column name tới entity name
export const RELATION_COLUMN_NAME_TO_ENTITY_NAME: Record<string, string> = {
  userId: 'UserEntity',
  roleId: 'RoleEntity',
  roles: 'RoleEntity',
  permissions: 'PermissionEntity',
  classrooms: 'ClassroomEntity',
  permissionId: 'PermissionEntity',
  courseId: 'CourseEntity',
  subjectId: 'SubjectEntity',
  buildingId: 'BuildingEntity',
  classroomId: 'ClassroomEntity',
  facultyDepartmentId: 'FacultyDepartmentEntity',
  academicYearId: 'AcademicYearEntity',
  educationalSystemId: 'EducationalSystemEntity',
  academicCredentialId: 'AcademicCredentialsEntity',
  standardLectureHoursId: 'StandardLectureHoursEntity',
  lectureInvitationMoneyId: 'LectureInvitationMoneyEntity',
  exemptionPercentageId: 'ExemptionPercentageEntity',
  headOfDepartmentId: 'UserEntity',
  scopeFacultyDepartmentId: 'FacultyDepartmentEntity',
};

// Mapping relation entity tới field hiển thị
export const RELATION_DISPLAY_FIELDS: Record<string, string[]> = {
  UserEntity: ['fullName'],
  RoleEntity: ['name'],
  PermissionEntity: ['name'],
  CourseEntity: ['courseName'],
  SubjectEntity: ['name'],
  BuildingEntity: ['name'],
  ClassroomEntity: ['name'],
  FacultyDepartmentEntity: ['name'],
  AcademicYearEntity: ['yearCode'],
  EducationalSystemEntity: ['nameClass'],
  AcademicCredentialsEntity: ['name'],
  StandardLectureHoursEntity: ['lectureHours'],
  LectureInvitationMoneyEntity: ['educationalSystem'],
  ExemptionPercentageEntity: ['percentage'],
  RefreshTokenEntity: ['token', 'expiresAt'],
  AuditLogEntity: ['action', 'entityName', 'entityId'],
};

// Các relation field đặc biệt trong quan hệ 1-n hoặc n-n
export const RELATION_SPECIAL_FIELDS: Set<string> = new Set([
  'roles',
  'permissions',
  'classrooms',
]);

// Danh sách các entities không cần audit log
export const EXCLUDED_ENTITIES: Set<string> = new Set([
  'AuditLogEntity', // Tránh audit chính audit log gây lặp vô hạn
  'RefreshTokenEntity', // Token thay đổi quá nhiều
]);

// Danh sách fields nhạy cảm cần ẩn
export const DEFAULT_SENSITIVE_FIELDS: Set<string> = new Set([
  'password',
  'passwordHash',
  'salt',
  'refreshToken',
  'accessToken',
  'token',
  'secret',
  'privateKey',
  'apiKey',
]);

// Danh sách fields bỏ qua khi so sánh thay đổi
export const DEFAULT_EXCLUDE_FIELDS: Set<string> = new Set([
  'updatedAt',
  'updatedById',
  'uploadedAt',
  'createdAt',
  'createdById',
  'id',
  'version',
  'lastLoginAt',
  'loginCount',
  'deletedAt',
]);

/**
 * Kiểm tra entity có bị loại trừ khỏi audit log không
 */
export function isEntityExcluded(entityName: string): boolean {
  return EXCLUDED_ENTITIES.has(entityName);
}

/**
 * Chuẩn hóa tên entity từ class name
 */
function normalizeEntityName(constructor: any): string {
  return constructor.name || 'UnknownEntity';
}

/**
 * Lấy ID từ entity
 */
function extractEntityId(entity: any): string {
  if (!entity) return 'unknown';

  const idFields = ['id', 'uuid', '_id', 'entityId'];
  for (const field of idFields) {
    if (entity[field] !== undefined && entity[field] !== null) {
      return String(entity[field]);
    }
  }

  return 'unknown';
}

@Injectable()
@EventSubscriber()
export class AuditLogSubscriber
  implements EntitySubscriberInterface, OnApplicationShutdown
{
  private readonly logger = new Logger(AuditLogSubscriber.name);
  private readonly auditQueue: AuditLogParams[] = [];
  private isProcessing = false;
  private flushTimer?: NodeJS.Timeout;

  // Tối ưu performance với readonly configs
  private readonly excludeFields = DEFAULT_EXCLUDE_FIELDS;
  private readonly sensitiveFields = DEFAULT_SENSITIVE_FIELDS;

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
    private readonly clsService: ClsService<MyClsStore>,
    private readonly dataSource: DataSource,
    @Inject('AUDIT_CONFIG')
    private readonly auditConfig: AuditConfig,
  ) {
    this.initializeSubscriber();
  }

  private initializeSubscriber() {
    this.dataSource.subscribers.push(this);
    this.setupBatchFlushTimer();
  }

  private setupBatchFlushTimer() {
    this.flushTimer = setInterval(async () => {
      await this.processBatch();
    }, this.getAuditConfig().flushInterval);
  }

  listenTo() {
    return AuditableEntity;
  }

  async afterInsert(event: InsertEvent<AuditableEntity>) {
    await this.handleAuditEvent('INSERT', event.entity, {
      action: AuditAction.CREATE,
      newValues: event.entity,
      getChangedFields: (entity) => this.getAllFields(entity),
    });
  }

  async afterUpdate(event: UpdateEvent<AuditableEntity>) {
    const changedFields = this.getChangedFields(
      event.databaseEntity,
      event.entity,
      this.getAuditConfig(),
    );

    if (changedFields.length === 0) {
      return;
    }

    await this.handleAuditEvent('UPDATE', event.entity, {
      action: AuditAction.UPDATE,
      oldValues: event.databaseEntity,
      newValues: event.entity,
      changedFields,
    });
  }

  async afterRemove(event: RemoveEvent<AuditableEntity>) {
    await this.handleAuditEvent('REMOVE', event.entity, {
      action: AuditAction.DELETE,
      oldValues: event.entity,
    });
  }

  async afterSoftRemove(
    event: SoftRemoveEvent<AuditableEntity>,
  ): Promise<void> {
    await this.handleAuditEvent('SOFT_REMOVE', event.entity, {
      action: AuditAction.SOFT_DELETE,
      oldValues: event.entity,
      changedFields: ['deletedAt', 'isDeleted'],
    });
  }

  async afterRecover(event: RecoverEvent<AuditableEntity>): Promise<void> {
    await this.handleAuditEvent('RECOVER', event.entity, {
      action: AuditAction.RESTORE,
      newValues: event.entity,
      changedFields: ['deletedAt', 'isDeleted'],
    });
  }

  private async handleAuditEvent(
    eventType: string,
    entity: any,
    params: {
      action: AuditAction;
      oldValues?: any;
      newValues?: any;
      changedFields?: string[];
      getChangedFields?: (entity: any) => string[];
    },
  ): Promise<void> {
    try {
      if (!entity) return;

      const entityName = normalizeEntityName(entity.constructor);

      if (isEntityExcluded(entityName)) return;

      const entityId = extractEntityId(entity);
      const changedFields =
        params.changedFields || params.getChangedFields?.(entity) || [];

      const auditParams: AuditLogParams = {
        action: params.action,
        entityName,
        entityId,
        oldValues: params.oldValues
          ? this.sanitizeValues(params.oldValues)
          : undefined,
        newValues: params.newValues
          ? this.sanitizeValues(params.newValues)
          : undefined,
        changedFields,
        context: this.getAuditContext(),
      };

      this.auditQueue.push(auditParams);

      if (this.auditQueue.length >= this.getAuditConfig().batchSize) {
        await this.processBatch();
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi xử lý audit event ${eventType}:`, error);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.auditQueue.length === 0) return;

    this.isProcessing = true;
    const batch = this.auditQueue.splice(0, this.getAuditConfig().batchSize);

    try {
      const auditLogs = await Promise.all(
        batch.map((params) => this.createAuditLog(params)),
      );

      if (auditLogs.length > 0) {
        await this.auditRepository.save(auditLogs);
        this.logger.log(`✅ Đã lưu ${auditLogs.length} audit logs`);
      }
    } catch (error) {
      this.logger.error('❌ Lỗi lưu batch audit logs:', error);
      batch.forEach((params) => {
        params.error = error instanceof Error ? error.message : String(error);
      });
      this.auditQueue.unshift(...batch.slice(0, 10));
    } finally {
      this.isProcessing = false;
    }
  }

  private async createAuditLog(
    params: AuditLogParams,
  ): Promise<AuditLogEntity> {
    const context = params.context || {};

    return this.auditRepository.create({
      action: params.action,
      entityName: params.entityName,
      entityId: params.entityId,
      createdById: context.user?.id,
      status: params.error ? AuditStatus.FAILED : AuditStatus.SUCCESS,
      userId: context.user?.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      httpMethod: context.httpMethod as HttpMethod,
      endpoint: context.endpoint,
      oldValues: this.getAuditConfig().trackOldValues
        ? params.oldValues
        : undefined,
      newValues: this.getAuditConfig().trackNewValues
        ? params.newValues
        : undefined,
      changedFields: params.changedFields,
      metadata: {
        ...context.metadata,
        error: params.error,
        timestamp: new Date().toISOString(),
        batchProcessed: true,
      },
      description: await this.generateDescription(
        params.action,
        params.entityName,
        params.changedFields,
        params.oldValues,
        params.newValues,
        context.user,
      ),
    });
  }

  private getAuditContext(): AuditContext {
    try {
      return this.clsService.get('auditContext') || {};
    } catch {
      return {};
    }
  }

  private async generateDescription(
    action: AuditAction,
    entityName: string,
    changedFields?: string[],
    oldValues?: any,
    newValues?: any,
    user?: IRequest['user'],
  ): Promise<string> {
    const vietnameseEntityName = this.getVietnameseEntityName(entityName);
    const userInfo = user
      ? ` bởi <strong>${user.fullName} - ${user.username}</strong>`
      : '';

    let description = '';

    switch (action) {
      case AuditAction.CREATE:
        description = `Thêm mới ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.UPDATE:
        description = await this.generateUpdateDescription(
          vietnameseEntityName,
          userInfo,
          changedFields,
          oldValues,
          newValues,
        );
        break;

      case AuditAction.DELETE:
        description = `Xóa ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.SOFT_DELETE:
        description = `Xóa mềm ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.RESTORE:
        description = `Khôi phục ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.LOGIN:
        description = `Đăng nhập hệ thống<strong>${userInfo}</strong>`;
        break;

      case AuditAction.LOGOUT:
        description = `Đăng xuất hệ thống<strong>${userInfo}</strong>`;
        break;

      case AuditAction.FAILED_LOGIN:
        description = `Thử đăng nhập thất bại<strong>${userInfo}</strong>`;
        break;

      case AuditAction.PASSWORD_CHANGE:
        description = `Thay đổi mật khẩu<strong>${userInfo}</strong>`;
        break;

      case AuditAction.PERMISSION_CHANGE:
        description = `Cập nhật quyền hạn<strong>${userInfo}</strong>`;
        break;

      case AuditAction.EXPORT:
        description = `Xuất dữ liệu ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.IMPORT:
        description = `Nhập dữ liệu ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.VIEW:
        description = `Xem thông tin ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.DOWNLOAD:
        description = `Tải xuống ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      case AuditAction.UPLOAD:
        description = `Tải lên ${vietnameseEntityName}<strong>${userInfo}</strong>`;
        break;

      default:
        description = `Thực hiện thao tác "${action}" trên ${vietnameseEntityName}<strong>${userInfo}</strong>`;
    }

    // Cắt ngắn nếu quá dài
    const { maxDescriptionLength } = this.getAuditConfig();
    return description.length > maxDescriptionLength
      ? description.substring(0, maxDescriptionLength - 3) + '...'
      : description;
  }

  private getNestedValue<T extends object, R = unknown>(
    obj: T,
    path: string,
    defaultValue?: R,
  ): R | undefined {
    if (!obj || typeof obj !== 'object') return defaultValue;

    return (
      path.split('.').reduce<any>((acc, key) => {
        return acc && typeof acc === 'object' ? acc[key] : undefined;
      }, obj) ?? defaultValue
    );
  }

  private async generateUpdateDescription(
    vietnameseEntityName: string,
    userInfo: string,
    changedFields?: string[],
    oldValues?: any,
    newValues?: any,
  ): Promise<string> {
    if (!changedFields || changedFields.length === 0) {
      return `Cập nhật ${vietnameseEntityName}${userInfo} - Không có thay đổi`;
    }
    let description = `Cập nhật ${vietnameseEntityName}${userInfo}:\n<ul>`;

    // Lọc ra những field có thay đổi và kết thúc bằng Id
    const changedFieldsEndWithId = changedFields.filter((field) => {
      return field.endsWith('Id');
    });

    // Lấy ra các entity từ changedFieldsEndWithId
    await Promise.all(
      changedFieldsEndWithId.map(async (field) => {
        const entityName = RELATION_COLUMN_NAME_TO_ENTITY_NAME[field];
        const repository = this.dataSource.getRepository(entityName);

        const [oldValue, newValue] = await repository.find({
          where: {
            id: In([
              this.getNestedValue(oldValues, field) || undefined,
              this.getNestedValue(newValues, field) || undefined,
            ]),
          },
          select: RELATION_DISPLAY_FIELDS[entityName],
        });

        const normalizedOldValue = this.normalizeObject(oldValue);
        const normalizedNewValue = this.normalizeObject(newValue);
        const vietnameseFieldName = this.getVietnameseFieldName(field);

        description += `<li><strong>${vietnameseFieldName}:</strong> "${this.displayValue(normalizedOldValue[RELATION_DISPLAY_FIELDS[entityName][0]])}" → "${this.displayValue(normalizedNewValue[RELATION_DISPLAY_FIELDS[entityName][0]])}"</li>`;
      }),
    );

    // Lọc ra những relation field đặc biệt
    const relationSpecialFields = changedFields.filter((field) =>
      RELATION_SPECIAL_FIELDS.has(field),
    );
    await Promise.all(
      relationSpecialFields.map(async (field) => {
        const entityName = RELATION_COLUMN_NAME_TO_ENTITY_NAME[field];
        const repository = this.dataSource.getRepository(entityName);

        const oldValuesTemp = this.getNestedValue(oldValues, field) as any;
        const newValuesTemp = this.getNestedValue(newValues, field) as any;

        const realOldValue = await repository.find({
          where: {
            id: In(oldValuesTemp?.map((item: any) => item.id) || []),
          },
          select: RELATION_DISPLAY_FIELDS[entityName],
        });

        const realNewValue = await repository.find({
          where: {
            id: In(newValuesTemp?.map((item: any) => item.id) || []),
          },
          select: RELATION_DISPLAY_FIELDS[entityName],
        });

        const normalizedOldValue = this.normalizeObject(realOldValue);
        const normalizedNewValue = this.normalizeObject(realNewValue);
        const vietnameseFieldName = this.getVietnameseFieldName(field);

        description += `<li><strong>${vietnameseFieldName}:</strong> "${this.displayValue(normalizedOldValue, RELATION_DISPLAY_FIELDS[entityName][0])}" → "${this.displayValue(normalizedNewValue, RELATION_DISPLAY_FIELDS[entityName][0])}"</li>`;
      }),
    );

    // Lọc ra những field có thay đổi và không kết thúc bằng Id
    const changedFieldsNotEndWithId = changedFields.filter(
      (field) =>
        !field.endsWith('Id') &&
        !relationSpecialFields.includes(field) &&
        !changedFieldsEndWithId.includes(field),
    );

    changedFieldsNotEndWithId.forEach((field) => {
      const vietnameseFieldName = this.getVietnameseFieldName(field);
      const oldVal = this.getNestedValue(oldValues, field, '');
      const newVal = this.getNestedValue(newValues, field, '');

      description += `<li><strong>${vietnameseFieldName}:</strong> "${this.displayValue(oldVal)}" → "${this.displayValue(newVal)}"</li>`;
    });

    return description.trim() + '</ul>';
  }

  private displayValue(value: any, fieldInArray?: string): string {
    // Xử lý null hoặc undefined
    if (value === null || value === undefined) return '';

    // Xử lý Date
    if (value instanceof Date) {
      return value.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    // Xử lý chuỗi dạng ISO date
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      const date = new Date(value);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    // Xử lý mảng
    if (Array.isArray(value)) {
      return `${value.map((v) => `${fieldInArray ? this.displayValue(v[fieldInArray]) : this.displayValue(v)}`).join(', ')}`;
    }

    // Xử lý object (không phải mảng)
    if (typeof value === 'object') {
      return `<ul>${Object.entries(value)
        .map(
          ([k, v]) => `<li><strong>${k}:</strong> ${this.displayValue(v)}</li>`,
        )
        .join('')}</ul>`;
    }

    // Xử lý number, boolean, string
    return String(value);
  }

  private sanitizeValues(values: any): any {
    if (!values || typeof values !== 'object') return values;

    const sanitized = { ...values };

    // Ẩn các trường nhạy cảm
    for (const field of this.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***ĐÃ ẨN***';
      }
    }

    // Xử lý nested objects (với depth limit để tránh infinite recursion)
    for (const [key, value] of Object.entries(sanitized)) {
      if (value && typeof value === 'object' && !this.isSpecialObject(value)) {
        sanitized[key] = this.sanitizeValues(value);
      }
    }

    return sanitized;
  }

  private isSpecialObject(obj: any): boolean {
    return (
      obj instanceof Date ||
      obj instanceof RegExp ||
      Array.isArray(obj) ||
      obj instanceof Map ||
      obj instanceof Set
    );
  }

  private deepEqual(a: any, b: any): boolean {
    // So sánh chính xác null/undefined
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Number → convert về string
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b;
    }

    // So sánh Date
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // So sánh Array
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    // So sánh Object
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(this.normalizeObject(a));
      const keysB = Object.keys(this.normalizeObject(b));
      if (keysA.length !== keysB.length) return false;

      return keysA.every((key) => this.deepEqual(a[key], b[key]));
    }

    // Các kiểu primitive
    return String(a) === String(b);
  }

  private normalizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj
        .map((item) => this.normalizeObject(item))
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== '' &&
            value !== 'null',
        ) as T;
    }

    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([key, value]) => [key, this.normalizeObject(value)])
        .filter(
          ([, value]) =>
            value !== null &&
            value !== undefined &&
            value !== '' &&
            value !== 'null',
        ),
    ) as T;
  }

  private getChangedFields(
    oldValues: any,
    newValues: any,
    config?: AuditConfig,
    parentKey: string = '',
  ): string[] {
    const changedFields: string[] = [];
    const excludeFields = this.excludeFields;

    if (!oldValues || !newValues) return changedFields;

    // Lấy tất cả keys từ cả old và new values
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (excludeFields.has(fullKey) || excludeFields.has(key)) continue;

      const oldValue = oldValues[key];
      const newValue = newValues[key];

      // Nếu là object thì đệ quy, nhưng không đệ quy cho Date và Array
      if (
        oldValue &&
        newValue &&
        typeof oldValue === 'object' &&
        typeof newValue === 'object' &&
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue) &&
        !(oldValue instanceof Date) &&
        !(newValue instanceof Date)
      ) {
        changedFields.push(
          ...this.getChangedFields(oldValue, newValue, config, fullKey),
        );
      } else if (!this.deepEqual(oldValue, newValue)) {
        changedFields.push(fullKey);
      }
    }

    return changedFields;
  }

  private getAllFields(entity: any): string[] {
    if (!entity || typeof entity !== 'object') return [];

    return Object.keys(entity).filter(
      (key) => !this.excludeFields.has(key) && !key.startsWith('_'),
    );
  }

  private getAuditConfig() {
    const config = this.auditConfig;
    return {
      excludeFields: Array.from(config.excludeFields ?? this.excludeFields),
      sensitiveFields: Array.from(
        config.sensitiveFields ?? this.sensitiveFields,
      ),
      trackOldValues: config.trackOldValues ?? true,
      trackNewValues: config.trackNewValues ?? true,
      maxDescriptionLength: config.maxDescriptionLength ?? 2000,
      enabled: config.enabled ?? true,
      async: config.async ?? true,
      batchSize: config.batchSize ?? 50,
      includeFields: Array.from(config.includeFields ?? []),
      maxFieldsToShow: config.maxFieldsToShow ?? 10,
      flushInterval: config.flushInterval ?? 5000,
    };
  }

  private getVietnameseEntityName(entityName: string): string {
    const vietnameseName = ENTITY_NAME_MAPPING[entityName] || entityName;
    return vietnameseName;
  }

  private getVietnameseFieldName(fieldName: string): string {
    const vietnameseName = FIELD_NAME_MAPPING[fieldName] || fieldName;
    return vietnameseName;
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('🛑 AuditLogSubscriber đang tắt...');

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Xử lý các audit log còn lại
    if (this.auditQueue.length > 0) {
      this.logger.log(
        `📤 Xử lý ${this.auditQueue.length} audit logs cuối cùng...`,
      );
      await this.processBatch();
    }

    this.logger.log('✅ AuditLogSubscriber đã tắt hoàn tất');
  }
}
