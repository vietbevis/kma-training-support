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
import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';
import { KyHoc } from 'src/shared/enums/semester.enum';

export class StandardDetailTimeSlotsDto {
  @ApiProperty({
    description: 'Thứ',
    enum: DayOfWeek,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ description: 'Tiết học', example: '1->3' })
  @IsString()
  timeSlot!: string;

  @ApiProperty({ description: 'Phòng học' })
  @IsString()
  roomName!: string;

  @ApiPropertyOptional({ description: 'Tòa nhà' })
  @IsOptional()
  @IsString()
  buildingName?: string;

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2025-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2025-12-20' })
  @IsDateString()
  endDate!: string;
}

export class CreateStandardDto {
  @ApiProperty({ description: 'Tên lớp học phần cụ thể' })
  @IsString()
  className!: string;

  @ApiProperty({ enum: KyHoc, description: 'Kỳ học' })
  @IsEnum(KyHoc)
  semester!: KyHoc;

  @ApiProperty({ description: 'Hình thức học' })
  @IsString()
  classType!: string;

  @ApiProperty({ description: 'Số sinh viên đăng ký' })
  @IsInt()
  @Min(0)
  studentCount!: number;

  @ApiProperty({ description: 'Số tiết lý thuyết' })
  @IsInt()
  @Min(0)
  theoryHours!: number;

  @ApiProperty({ description: 'Hệ số lớp đông' })
  @IsNumber()
  @Min(1)
  @Max(2)
  crowdClassCoefficient!: number;

  @ApiProperty({ description: 'Số tiết thực (tính hệ số)' })
  @IsNumber()
  @Min(0)
  actualHours!: number;

  @ApiProperty({ description: 'Hệ số ngoài giờ' })
  @IsNumber()
  @Min(1)
  overtimeCoefficient!: number;

  @ApiProperty({ description: 'Số tiết quy chuẩn' })
  @IsNumber()
  @Min(0)
  standardHours!: number;

  @ApiProperty({ description: 'Ngày bắt đầu' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Tên giảng viên' })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  @ApiPropertyOptional({
    description: 'Chi tiết lịch học (time slots)',
    type: [StandardDetailTimeSlotsDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardDetailTimeSlotsDto)
  detailTimeSlots?: StandardDetailTimeSlotsDto[];

  @ApiProperty({ description: 'ID học phần' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ description: 'ID năm học' })
  @IsUUID()
  academicYearId!: string;

  // ========== THÊM 2 TRƯỜNG MỚI ==========
  @ApiPropertyOptional({
    description: 'Tiêu đề section',
    example: 'I. Các học phần thuộc Khoa CB'
  })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiPropertyOptional({
    description: 'Tên khoa/bộ môn',
    example: 'Khoa CB'
  })
  @IsOptional()
  @IsString()
  department?: string;
  // ========================================
}

export class UpdateStandardDto extends PartialType(
  OmitType(CreateStandardDto, [
    'crowdClassCoefficient',
    'standardHours',
    'detailTimeSlots',
  ] as const),
) { }

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
    example: 'Khoa CB'
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

// DTO cho upload Excel quy chuẩn
export class StandardUploadDataDto {
  // @ApiProperty({ description: 'Số thứ tự' })
  // @IsInt()
  // @Min(1)
  // order!: number;

  @ApiProperty({ description: 'Mã học phần' })
  @IsString()
  courseCode!: string;

  @ApiProperty({ description: 'Số tín chỉ' })
  @IsInt()
  @Min(1)
  credits!: number;

  @ApiProperty({ description: 'Số sinh viên' })
  @IsInt()
  @Min(0)
  studentCount!: number;

  @ApiProperty({ description: 'Số tiết lý thuyết' })
  @IsInt()
  @Min(0)
  theoryHours!: number;

  @ApiProperty({ description: 'Hệ số lớp đông' })
  @IsNumber()
  crowdClassCoefficient!: number;

  @ApiProperty({ description: 'Số tiết thực' })
  @IsNumber()
  actualHours!: number;

  @ApiProperty({ description: 'Hệ số ngoài giờ' })
  @IsNumber()
  overtimeCoefficient!: number;

  @ApiProperty({ description: 'Số tiết quy chuẩn' })
  @IsNumber()
  standardHours!: number;

  @ApiProperty({ description: 'Tên lớp học phần' })
  @IsString()
  className!: string;

  @ApiProperty({ description: 'Hình thức học' })
  @IsString()
  classType!: string;

  @ApiPropertyOptional({
    description: 'Chi tiết lịch học',
    type: [StandardDetailTimeSlotsDto],
  })
  @IsOptional()
  @IsArray()
  detailTimeSlots?: StandardDetailTimeSlotsDto[];

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2025-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2025-12-20' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Giáo viên' })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  // ========== THÊM TRƯỜNG MỚI ==========
  @ApiPropertyOptional({
    description: 'Tên khoa/bộ môn được parse từ sectionTitle',
    example: 'Khoa CB'
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Ghi chú'
  })
  
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Kỳ học' })
  @IsString()
  semester!: string;

  @ApiPropertyOptional({ description: 'ID năm học' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
  // ========================================
}

export class StandardUploadDto {
  @ApiProperty({ description: 'Danh sách dữ liệu quy chuẩn' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StandardUploadDataDto)
  data!: StandardUploadDataDto[];
}

export class StandardConflictCheckDto {
  @ApiProperty({ description: 'Tên phòng học' })
  @IsString()
  roomName!: string;

  @ApiPropertyOptional({ description: 'Tên tòa nhà' })
  @IsOptional()
  @IsString()
  buildingName?: string;

  @ApiProperty({ enum: DayOfWeek, description: 'Thứ trong tuần' })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ description: 'Tiết học' })
  @IsString()
  timeSlot!: string;

  @ApiProperty({ description: 'Ngày bắt đầu' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'ID quy chuẩn cần loại trừ' })
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}