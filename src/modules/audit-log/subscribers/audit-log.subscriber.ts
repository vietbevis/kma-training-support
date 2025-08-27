import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
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
export const ENTITY_NAME_MAPPING = Object.freeze({
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
} as const);

// Mapping tên fields sang tiếng Việt
export const FIELD_NAME_MAPPING = Object.freeze({
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
  academicCredentialId: 'Học hàm/học vị',
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
} as const);

// Mapping relation column name tới entity name
export const RELATION_COLUMN_NAME_TO_ENTITY_NAME = Object.freeze({
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
} as const);

// White list fields kết thúc bằng Id nhưng không phải relation
export const WHITE_LIST_ID_FIELDS = new Set(['citizenId']);

// Mapping relation entity tới field hiển thị
export const RELATION_DISPLAY_FIELDS = Object.freeze({
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
} as const);

// Các relation field đặc biệt trong quan hệ 1-n hoặc n-n
export const RELATION_SPECIAL_FIELDS = new Set([
  'roles',
  'permissions',
  'classrooms',
]);

// Danh sách các entities không cần audit log
export const EXCLUDED_ENTITIES = new Set([
  'AuditLogEntity', // Tránh audit chính audit log gây lặp vô hạn
  'RefreshTokenEntity', // Token thay đổi quá nhiều
]);

// Danh sách fields nhạy cảm cần ẩn
export const DEFAULT_SENSITIVE_FIELDS = new Set([
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
export const DEFAULT_EXCLUDE_FIELDS = new Set([
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
export const isEntityExcluded = (entityName: string): boolean =>
  EXCLUDED_ENTITIES.has(entityName);

/**
 * Chuẩn hóa tên entity từ class name
 */
const normalizeEntityName = (constructor: any): string =>
  constructor.name || 'UnknownEntity';

/**
 * Lấy ID từ entity sử dụng lodash
 */
const extractEntityId = (entity: any): string => {
  if (!entity) return 'unknown';

  const idFields = ['id', 'uuid', '_id', 'entityId'];
  const foundField = _.find(idFields, (field) => !_.isNil(entity[field]));

  return foundField ? String(entity[foundField]) : 'unknown';
};

@Injectable()
@EventSubscriber()
export class AuditLogSubscriber
  implements EntitySubscriberInterface, OnApplicationShutdown
{
  private readonly logger = new Logger(AuditLogSubscriber.name);
  private readonly auditQueue: AuditLogParams[] = [];
  private isProcessing = false;
  private flushTimer?: NodeJS.Timeout;

  // Cache để tối ưu performance
  private readonly repositoryCache = new Map<string, Repository<any>>();
  private readonly entityValueCache = new Map<string, any>();

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
    const config = this.getAuditConfig();
    this.flushTimer = setInterval(async () => {
      await this.processBatch();
    }, config.flushInterval);
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
    );

    if (_.isEmpty(changedFields)) {
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
        changedFields: Array.from(new Set(changedFields)),
        context: this.getAuditContext(),
      };

      this.auditQueue.push(auditParams);

      const config = this.getAuditConfig();
      if (this.auditQueue.length >= config.batchSize) {
        await this.processBatch();
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi xử lý audit event ${eventType}:`, error);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || _.isEmpty(this.auditQueue)) return;

    this.isProcessing = true;
    const config = this.getAuditConfig();
    const batch = this.auditQueue.splice(0, config.batchSize);

    try {
      const auditLogs = await Promise.all(
        batch.map((params) => this.createAuditLog(params)),
      );

      const validAuditLogs = _.compact(auditLogs);

      if (!_.isEmpty(validAuditLogs)) {
        await this.auditRepository.save(validAuditLogs);
        this.logger.log(`✅ Đã lưu ${validAuditLogs.length} audit logs`);
      }
    } catch (error) {
      this.logger.error('❌ Lỗi lưu batch audit logs:', error);
      const errorBatch = _.take(
        batch.map((params) => ({ ...params, error: _.toString(error) })),
        10,
      );
      this.auditQueue.unshift(...errorBatch);
    } finally {
      this.isProcessing = false;
    }
  }

  private async createAuditLog(
    params: AuditLogParams,
  ): Promise<AuditLogEntity> {
    const context = params.context || {};
    const config = this.getAuditConfig();

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
      oldValues: config.trackOldValues ? params.oldValues : undefined,
      newValues: config.trackNewValues ? params.newValues : undefined,
      changedFields: Array.from(new Set(params.changedFields)),
      metadata: {
        ...context.metadata,
        error: params.error,
        timestamp: new Date().toISOString(),
        batchProcessed: true,
      },
      description: await this.generateDescription(
        params.action,
        params.entityName,
        Array.from(new Set(params.changedFields)),
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

    const actionDescriptions = {
      [AuditAction.CREATE]: `Thêm mới ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.DELETE]: `Xóa ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.SOFT_DELETE]: `Xóa mềm ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.RESTORE]: `Khôi phục ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.LOGIN]: `Đăng nhập hệ thống<strong>${userInfo}</strong>`,
      [AuditAction.LOGOUT]: `Đăng xuất hệ thống<strong>${userInfo}</strong>`,
      [AuditAction.FAILED_LOGIN]: `Thử đăng nhập thất bại<strong>${userInfo}</strong>`,
      [AuditAction.PASSWORD_CHANGE]: `Thay đổi mật khẩu<strong>${userInfo}</strong>`,
      [AuditAction.PERMISSION_CHANGE]: `Cập nhật quyền hạn<strong>${userInfo}</strong>`,
      [AuditAction.EXPORT]: `Xuất dữ liệu ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.IMPORT]: `Nhập dữ liệu ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.VIEW]: `Xem thông tin ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.DOWNLOAD]: `Tải xuống ${vietnameseEntityName}<strong>${userInfo}</strong>`,
      [AuditAction.UPLOAD]: `Tải lên ${vietnameseEntityName}<strong>${userInfo}</strong>`,
    };

    if (action === AuditAction.UPDATE) {
      description = await this.generateUpdateDescription(
        vietnameseEntityName,
        userInfo,
        Array.from(new Set(changedFields)),
        oldValues,
        newValues,
      );
    } else {
      description =
        actionDescriptions[action] ||
        `Thực hiện thao tác "${action}" trên ${vietnameseEntityName}<strong>${userInfo}</strong>`;
    }

    // Cắt ngắn nếu quá dài sử dụng lodash
    const { maxDescriptionLength } = this.getAuditConfig();
    return _.truncate(description, {
      length: maxDescriptionLength,
      separator: ' ',
      omission: '...',
    });
  }

  private async generateUpdateDescription(
    vietnameseEntityName: string,
    userInfo: string,
    changedFields?: string[],
    oldValues?: any,
    newValues?: any,
  ): Promise<string> {
    if (_.isEmpty(changedFields)) {
      return `Cập nhật ${vietnameseEntityName}${userInfo} - Không có thay đổi`;
    }

    let description = `Cập nhật ${vietnameseEntityName}${userInfo}:\n<ul>`;

    // Sử dụng lodash để filter và group fields
    const relationIdFields = _.filter(
      changedFields,
      (field) => _.endsWith(field, 'Id') && !WHITE_LIST_ID_FIELDS.has(field),
    );

    const specialRelationFields = _.filter(changedFields, (field) =>
      RELATION_SPECIAL_FIELDS.has(field),
    );

    const regularFields = _.difference(changedFields, [
      ...relationIdFields,
      ...specialRelationFields,
    ]);

    // Xử lý relation ID fields
    description += await this.processRelationIdFields(
      Array.from(new Set(relationIdFields)),
      oldValues,
      newValues,
    );

    // Xử lý special relation fields
    description += await this.processSpecialRelationFields(
      Array.from(new Set(specialRelationFields)),
      oldValues,
      newValues,
    );

    // Xử lý regular fields
    description += this.processRegularFields(
      Array.from(new Set(regularFields)),
      oldValues,
      newValues,
    );

    return description.trim() + '</ul>';
  }

  private async processRelationIdFields(
    fields: string[],
    oldValues: any,
    newValues: any,
  ): Promise<string> {
    const relationPromises = fields.map(async (field) => {
      const entityName = RELATION_COLUMN_NAME_TO_ENTITY_NAME[field];
      if (!entityName) return null;

      const repository = this.getRepository(entityName);
      const displayFields = RELATION_DISPLAY_FIELDS[entityName];

      const ids = _.compact([_.get(oldValues, field), _.get(newValues, field)]);

      if (_.isEmpty(ids)) return null;

      const entities = await repository.find({
        where: { id: In(ids) },
        select: [...displayFields, 'id'],
      });

      const entitiesById = _.keyBy(entities, 'id');
      const oldEntity = entitiesById[_.get(oldValues, field)];
      const newEntity = entitiesById[_.get(newValues, field)];

      const vietnameseFieldName = this.getVietnameseFieldName(field);
      const oldDisplayValue = this.displayValue(
        _.get(oldEntity, displayFields[0]),
      );
      const newDisplayValue = this.displayValue(
        _.get(newEntity, displayFields[0]),
      );

      return `<li><strong>${vietnameseFieldName}:</strong> "${oldDisplayValue}" → "${newDisplayValue}"</li>`;
    });

    const results = await Promise.all(relationPromises);
    return _.compact(results).join('');
  }

  private async processSpecialRelationFields(
    fields: string[],
    oldValues: any,
    newValues: any,
  ): Promise<string> {
    const relationPromises = fields.map(async (field) => {
      const entityName = RELATION_COLUMN_NAME_TO_ENTITY_NAME[field];
      if (!entityName) return null;

      const repository = this.getRepository(entityName);
      const displayFields = RELATION_DISPLAY_FIELDS[entityName];

      const oldIds = _.map(_.get(oldValues, field, []), 'id');
      const newIds = _.map(_.get(newValues, field, []), 'id');
      const allIds = _.union(oldIds, newIds);

      if (_.isEmpty(allIds)) return null;

      const entities = await repository.find({
        where: { id: In(allIds) },
        select: [...displayFields, 'id'],
      });

      const entitiesById = _.keyBy(entities, 'id');
      const oldEntities = _.map(oldIds, (id) => entitiesById[id]).filter(
        Boolean,
      );
      const newEntities = _.map(newIds, (id) => entitiesById[id]).filter(
        Boolean,
      );

      const vietnameseFieldName = this.getVietnameseFieldName(field);
      const oldDisplayValues = _.map(oldEntities, (entity) =>
        this.displayValue(_.get(entity, displayFields[0])),
      );
      const newDisplayValues = _.map(newEntities, (entity) =>
        this.displayValue(_.get(entity, displayFields[0])),
      );

      return `<li><strong>${vietnameseFieldName}:</strong> "${oldDisplayValues.join(', ')}" → "${newDisplayValues.join(', ')}"</li>`;
    });

    const results = await Promise.all(relationPromises);
    return _.compact(results).join('');
  }

  private processRegularFields(
    fields: string[],
    oldValues: any,
    newValues: any,
  ): string {
    const fieldDescriptions = fields.map((field) => {
      const vietnameseFieldName = this.getVietnameseFieldName(field);
      const oldVal = _.get(oldValues, field, '');
      const newVal = _.get(newValues, field, '');

      return `<li><strong>${vietnameseFieldName}:</strong> "${this.displayValue(oldVal)}" → "${this.displayValue(newVal)}"</li>`;
    });

    return fieldDescriptions.join('');
  }

  private getRepository(entityName: string): Repository<any> {
    if (!this.repositoryCache.has(entityName)) {
      const repository = this.dataSource.getRepository(entityName);
      this.repositoryCache.set(entityName, repository);
    }
    return this.repositoryCache.get(entityName)!;
  }

  private displayValue(value: any): string {
    // Xử lý null hoặc undefined
    if (_.isNil(value)) return '';

    // Xử lý Date object
    if (_.isDate(value)) {
      return value.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    // Xử lý mảng
    if (_.isArray(value)) {
      return _.map(value, (v) => this.displayValue(v)).join(', ');
    }

    // Xử lý object (không phải mảng)
    if (_.isObject(value) && !_.isArray(value)) {
      const entries = _.map(
        value,
        (v, k) => `<li><strong>${k}:</strong> ${this.displayValue(v)}</li>`,
      );
      return `<ul>${entries.join('')}</ul>`;
    }

    // Xử lý số
    if (_.isNumber(value)) {
      return value.toString();
    }

    // Xử lý boolean
    if (_.isBoolean(value)) {
      return value.toString();
    }

    // Xử lý chuỗi - kiểm tra ISO date với regex chặt chẽ hơn
    if (_.isString(value)) {
      // Regex để kiểm tra định dạng ISO 8601 chính xác
      const isoDateRegex =
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

      if (isoDateRegex.test(value) && !isNaN(Date.parse(value))) {
        const date = new Date(value);
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }

      return value;
    }

    // Fallback cho các trường hợp khác
    return _.toString(value);
  }

  private sanitizeValues(values: any): any {
    if (!_.isObject(values)) return values;

    const sanitized = _.cloneDeep(values);

    // Ẩn các trường nhạy cảm sử dụng lodash
    _.forEach(Array.from(this.sensitiveFields), (field) => {
      if (_.has(sanitized, field)) {
        _.set(sanitized, field, '***ĐÃ ẨN***');
      }
    });

    // Xử lý nested objects với depth limit để tránh infinite recursion
    const sanitizeRecursive = (obj: any, depth = 0): any => {
      if (depth > 3 || !_.isObject(obj) || this.isSpecialObject(obj)) {
        return obj;
      }

      return _.mapValues(obj, (value) => {
        if (_.isObject(value) && !this.isSpecialObject(value)) {
          return sanitizeRecursive(value, depth + 1);
        }
        return value;
      });
    };

    return sanitizeRecursive(sanitized);
  }

  private isSpecialObject(obj: any): boolean {
    return (
      _.isDate(obj) ||
      _.isRegExp(obj) ||
      _.isArray(obj) ||
      obj instanceof Map ||
      obj instanceof Set ||
      _.isBuffer(obj)
    );
  }

  private deepEqual(a: any, b: any): boolean {
    // Sử dụng lodash để so sánh deep equal
    return _.isEqual(this.normalizeObject(a), this.normalizeObject(b));
  }

  private normalizeObject<T>(obj: T): T {
    if (!_.isObject(obj)) {
      return this.normalizeValue(obj);
    }

    if (_.isArray(obj)) {
      return _.chain(obj)
        .map((item) => this.normalizeObject(item))
        .filter((value) => !this.isEmpty(value))
        .value() as T;
    }

    return _.chain(obj as Record<string, unknown>)
      .mapValues((value) => this.normalizeObject(value))
      .omitBy((value) => this.isEmpty(value))
      .value() as T;
  }

  private normalizeValue<T>(value: T): T {
    // Chuẩn hóa null, undefined, chuỗi rỗng và chuỗi 'null' thành null
    if (_.isNil(value) || value === '' || value === 'null') {
      return null as T;
    }

    // Nếu là chuỗi và có thể chuyển thành số
    if (_.isString(value) && this.isNumericString(value)) {
      const numValue = parseFloat(value as string);
      return numValue as T;
    }

    return value;
  }

  private isNumericString(str: string): boolean {
    // Kiểm tra xem chuỗi có phải là số hợp lệ không
    // Loại bỏ khoảng trắng đầu cuối
    const trimmed = str.trim();

    // Chuỗi rỗng không phải số
    if (trimmed === '') return false;

    // Sử dụng Number() và isNaN để kiểm tra
    const num = Number(trimmed);
    return !isNaN(num) && isFinite(num);
  }

  private isEmpty(value: any): boolean {
    // Sau khi normalize, chỉ cần kiểm tra null
    return value === null;
  }

  private getChangedFields(
    oldValues: any,
    newValues: any,
    parentKey: string = '',
  ): string[] {
    if (!oldValues || !newValues) return [];

    const changedFields: string[] = [];
    const allKeys = _.union(_.keys(oldValues), _.keys(newValues));

    _.forEach(allKeys, (key) => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      // Skip excluded fields
      if (this.excludeFields.has(fullKey) || this.excludeFields.has(key)) {
        return;
      }

      const oldValue = _.get(oldValues, key);
      const newValue = _.get(newValues, key);

      // Xử lý number đưa về string để so sánh
      if (
        !_.isNaN(_.toNumber(oldValue)) &&
        !_.isNaN(_.toNumber(newValue)) &&
        _.toNumber(oldValue) !== _.toNumber(newValue)
      ) {
        changedFields.push(fullKey);
      }

      // Nếu là object thì đệ quy, nhưng không đệ quy cho Date và Array
      if (
        _.isObject(oldValue) &&
        _.isObject(newValue) &&
        !_.isArray(oldValue) &&
        !_.isArray(newValue) &&
        !_.isDate(oldValue) &&
        !_.isDate(newValue)
      ) {
        changedFields.push(
          ...this.getChangedFields(oldValue, newValue, fullKey),
        );
      } else if (!this.deepEqual(oldValue, newValue)) {
        changedFields.push(fullKey);
      }
    });

    return changedFields;
  }

  private getAllFields(entity: any): string[] {
    if (!_.isObject(entity)) return [];

    return _.chain(entity)
      .keys()
      .filter((key) => !this.excludeFields.has(key) && !_.startsWith(key, '_'))
      .value();
  }

  private getAuditConfig(): Required<AuditConfig> {
    const config = this.auditConfig;
    return {
      excludeFields: config.excludeFields ?? [...this.excludeFields],
      sensitiveFields: config.sensitiveFields ?? [...this.sensitiveFields],
      trackOldValues: config.trackOldValues ?? true,
      trackNewValues: config.trackNewValues ?? true,
      maxDescriptionLength: config.maxDescriptionLength ?? 2000,
      enabled: config.enabled ?? true,
      async: config.async ?? true,
      batchSize: config.batchSize ?? 50,
      includeFields: config.includeFields ?? [],
      maxFieldsToShow: config.maxFieldsToShow ?? 10,
      flushInterval: config.flushInterval ?? 5000,
    };
  }

  private getVietnameseEntityName(entityName: string): string {
    return _.get(ENTITY_NAME_MAPPING, entityName, entityName);
  }

  private getVietnameseFieldName(fieldName: string): string {
    return _.get(FIELD_NAME_MAPPING, fieldName, fieldName);
  }

  // Memoized methods
  private readonly memoizedGetVietnameseEntityName = _.memoize(
    this.getVietnameseEntityName.bind(this),
  );

  private readonly memoizedGetVietnameseFieldName = _.memoize(
    this.getVietnameseFieldName.bind(this),
  );

  // Cache management methods
  private clearCaches(): void {
    this.repositoryCache.clear();
    this.entityValueCache.clear();
    this.memoizedGetVietnameseEntityName.cache.clear?.();
    this.memoizedGetVietnameseFieldName.cache.clear?.();
  }

  // Batch processing with error recovery
  private async processBatchWithRetry(maxRetries = 3): Promise<void> {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.processBatch();
        break;
      } catch (error) {
        retryCount++;
        this.logger.warn(
          `⚠️ Batch processing failed (attempt ${retryCount}/${maxRetries}):`,
          error,
        );

        if (retryCount === maxRetries) {
          this.logger.error('❌ Max retries reached for batch processing');
          throw error;
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 1000),
        );
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('🛑 AuditLogSubscriber đang tắt...');

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Xử lý các audit log còn lại với timeout
    if (!_.isEmpty(this.auditQueue)) {
      this.logger.log(
        `📤 Xử lý ${this.auditQueue.length} audit logs cuối cùng...`,
      );

      try {
        // Set timeout để tránh hang khi shutdown
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), 30000),
        );

        const processPromise = this.processBatchWithRetry();

        await Promise.race([processPromise, timeoutPromise]);

        this.logger.log('✅ Đã xử lý xong các audit logs cuối cùng');
      } catch (error) {
        this.logger.error('❌ Lỗi xử lý audit logs khi shutdown:', error);
      }
    }

    // Clear caches
    this.clearCaches();

    this.logger.log('✅ AuditLogSubscriber đã tắt hoàn tất');
  }
}