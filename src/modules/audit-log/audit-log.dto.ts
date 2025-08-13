import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  AuditAction,
  AuditStatus,
} from 'src/database/entities/audit-log.entity';

// Request DTOs
export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi mỗi trang',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Tên entity cần lọc',
    example: 'UserEntity',
  })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({
    description: 'Loại hành động cần lọc',
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'ID người dùng thực hiện hành động',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'ID khoa/bộ môn',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;
}

export class CreateManualAuditLogDto {
  @ApiProperty({
    description: 'Loại hành động',
    enum: AuditAction,
    example: AuditAction.CUSTOM,
  })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({
    description: 'Tên entity bị tác động',
    example: 'UserEntity',
  })
  @IsString()
  entityName: string;

  @ApiPropertyOptional({
    description: 'ID của entity bị tác động',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết hành động',
    example: 'Thêm mới người dùng qua import Excel',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Giá trị cũ trước khi thay đổi',
    example: { name: 'Old Name', email: 'old@example.com' },
  })
  @IsOptional()
  oldValues?: any;

  @ApiPropertyOptional({
    description: 'Giá trị mới sau khi thay đổi',
    example: { name: 'New Name', email: 'new@example.com' },
  })
  @IsOptional()
  newValues?: any;

  @ApiPropertyOptional({
    description: 'Danh sách các trường bị thay đổi',
    example: ['name', 'email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  changedFields?: string[];

  @ApiPropertyOptional({
    description: 'Metadata bổ sung',
    example: { importType: 'excel', fileName: 'users.xlsx' },
  })
  @IsOptional()
  metadata?: any;
}

export class GetAuditStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu thống kê (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc thống kê (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class ManageExcludedEntityDto {
  @ApiProperty({
    description: 'Tên entity cần quản lý',
    example: 'RefreshTokenEntity',
  })
  @IsString()
  entityName: string;
}

// Response DTOs
export class UserSummaryDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
  })
  fullName: string;

  @ApiProperty({
    description: 'Tên đăng nhập',
    example: 'nguyen.van.a',
  })
  username: string;

  @ApiProperty({
    description: 'Mã nhân viên',
    example: 'NV001',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Email',
    example: 'nguyen.van.a@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Chức vụ',
    example: 'Giảng viên',
  })
  position?: string;
}

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'ID audit log',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Loại hành động',
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Tên entity bị tác động',
    example: 'UserEntity',
  })
  entityName: string;

  @ApiPropertyOptional({
    description: 'ID entity bị tác động',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  entityId?: string;

  @ApiProperty({
    description: 'Trạng thái hành động',
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @ApiPropertyOptional({
    description: 'Thông tin người thực hiện hành động',
    type: UserSummaryDto,
  })
  user?: UserSummaryDto;

  @ApiPropertyOptional({
    description: 'Địa chỉ IP',
    example: '192.168.1.1',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User Agent',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'HTTP Method',
    example: 'POST',
  })
  httpMethod?: string;

  @ApiPropertyOptional({
    description: 'Endpoint được gọi',
    example: '/api/users',
  })
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'Giá trị cũ',
  })
  oldValues?: any;

  @ApiPropertyOptional({
    description: 'Giá trị mới',
  })
  newValues?: any;

  @ApiPropertyOptional({
    description: 'Các trường bị thay đổi',
    type: [String],
  })
  changedFields?: string[];

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết',
    example: 'Thêm mới người dùng Nguyễn Văn A',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Thông báo lỗi nếu có',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Metadata bổ sung',
  })
  metadata?: any;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Tổng số bản ghi',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Số bản ghi mỗi trang',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Tổng số trang',
    example: 2,
  })
  totalPages: number;
}

export class GetAuditLogsResponseDto {
  @ApiProperty({
    description: 'Danh sách audit logs',
    type: [AuditLogResponseDto],
  })
  data: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class ActionStatsDto {
  @ApiProperty({
    description: 'Loại hành động',
    example: 'CREATE',
  })
  action: string;

  @ApiProperty({
    description: 'Số lượng',
    example: 25,
  })
  count: number;
}

export class EntityStatsDto {
  @ApiProperty({
    description: 'Tên entity',
    example: 'UserEntity',
  })
  entityName: string;

  @ApiProperty({
    description: 'Tên tiếng Việt',
    example: 'Người dùng',
  })
  vietnameseName: string;

  @ApiProperty({
    description: 'Số lượng',
    example: 50,
  })
  count: number;
}

export class UserStatsDto {
  @ApiProperty({
    description: 'ID người dùng',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Số lượng hành động',
    example: 15,
  })
  count: number;
}

export class GetAuditStatsResponseDto {
  @ApiProperty({
    description: 'Thống kê theo hành động',
    type: [ActionStatsDto],
  })
  actionStats: ActionStatsDto[];

  @ApiProperty({
    description: 'Thống kê theo entity',
    type: [EntityStatsDto],
  })
  entityStats: EntityStatsDto[];

  @ApiProperty({
    description: 'Thống kê theo người dùng',
    type: [UserStatsDto],
  })
  userStats: UserStatsDto[];
}
