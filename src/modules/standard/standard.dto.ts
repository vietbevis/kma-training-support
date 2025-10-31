import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { KyHoc } from 'src/shared/enums/semester.enum';

export class CreateStandardDto {
  @ApiProperty({ description: 'Tên lớp học phần cụ thể' })
  @IsString()
  className!: string;

  @ApiProperty({ enum: KyHoc, description: 'Kỳ học' })
  @IsEnum(KyHoc)
  semester!: KyHoc;

  @ApiPropertyOptional({ description: 'Hình thức học' })
  @IsOptional()
  @IsString()
  classType?: string;

  @ApiPropertyOptional({ description: 'Số sinh viên đăng ký' })
  @IsOptional()
  @IsInt()
  @Min(0)
  studentCount?: number;

  @ApiPropertyOptional({ description: 'Số tiết lý thuyết' })
  @IsOptional()
  @IsInt()
  @Min(0)
  theoryHours?: number;

  @ApiPropertyOptional({ description: 'Hệ số lớp đông' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  crowdClassCoefficient?: number;

  @ApiPropertyOptional({ description: 'Số tiết thực (tính hệ số)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Hệ số ngoài giờ' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeCoefficient?: number;

  @ApiPropertyOptional({ description: 'Số tiết quy chuẩn' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardHours?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tên giảng viên' })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  @ApiPropertyOptional({
    description:
      'Chi tiết lịch học (không sử dụng cho standard, chỉ để tương thích)',
  })
  @IsOptional()
  @IsArray()
  detailTimeSlots?: any[];

  @ApiPropertyOptional({ description: 'ID học phần' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'ID năm học' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}

export class UpdateStandardDto extends PartialType(
  OmitType(CreateStandardDto, [
    'crowdClassCoefficient',
    'standardHours',
    'detailTimeSlots',
  ] as const),
) {}

export class StandardQueryDto {
  @ApiPropertyOptional({ description: 'ID học phần' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'ID năm học' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ enum: KyHoc, description: 'Kỳ học' })
  @IsOptional()
  @IsEnum(KyHoc)
  semester?: KyHoc;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu tìm kiếm' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc tìm kiếm' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên lớp' })
  @IsOptional()
  @IsString()
  className?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo giảng viên' })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  // ========== THÊM FILTER THEO DEPARTMENT ==========
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo khoa/bộ môn',
    example: 'Khoa CB',
  })
  @IsOptional()
  @IsString()
  department?: string;
  // =================================================

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

// DTO cho upload Word quy chuẩn
export class StandardUploadDataDto {
  @ApiPropertyOptional({ description: 'Mã học phần' })
  @IsOptional()
  @IsString()
  courseCode?: string;

  @ApiPropertyOptional({ description: 'Số tín chỉ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ description: 'Số sinh viên' })
  @IsOptional()
  @IsInt()
  @Min(0)
  studentCount?: number;

  @ApiPropertyOptional({ description: 'Số tiết lý thuyết' })
  @IsOptional()
  @IsInt()
  @Min(0)
  theoryHours?: number;

  @ApiPropertyOptional({ description: 'Hệ số lớp đông' })
  @IsOptional()
  @IsNumber()
  crowdClassCoefficient?: number;

  @ApiPropertyOptional({ description: 'Số tiết thực' })
  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Hệ số ngoài giờ' })
  @IsOptional()
  @IsNumber()
  overtimeCoefficient?: number;

  @ApiPropertyOptional({ description: 'Số tiết quy chuẩn' })
  @IsOptional()
  @IsNumber()
  standardHours?: number;

  @ApiProperty({ description: 'Tên lớp học phần' })
  @IsString()
  className!: string;

  @ApiPropertyOptional({ description: 'Hình thức học' })
  @IsOptional()
  @IsString()
  classType?: string;

  @ApiPropertyOptional({
    description: 'Chi tiết lịch học (không sử dụng cho standard)',
  })
  @IsOptional()
  @IsArray()
  detailTimeSlots?: any[];

  @ApiPropertyOptional({ description: 'Ngày bắt đầu', example: '2025-09-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc', example: '2025-12-20' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Giáo viên' })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  @ApiPropertyOptional({
    description: 'Tên khoa/bộ môn được parse từ sectionTitle',
    example: 'Khoa CB',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Ghi chú',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Kỳ học' })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiPropertyOptional({ description: 'ID năm học' })
  @IsOptional()
  @IsString()
  academicYearId?: string;
}

export class StandardUploadDto {
  @ApiProperty({ description: 'Danh sách dữ liệu quy chuẩn' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardUploadDataDto)
  data!: StandardUploadDataDto[];
}
