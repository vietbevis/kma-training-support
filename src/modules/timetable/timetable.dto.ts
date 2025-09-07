import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
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


export class DetailTimeSlotsDto {
  @ApiProperty({
    description: "Thứ",
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


export class CreateTimetableDto {
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
  @Min(0)
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

  @ApiProperty({
    description: 'Chi tiết lịch học',
    type: [DetailTimeSlotsDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DetailTimeSlotsDto)
  detailTimeSlots!: DetailTimeSlotsDto[];

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'ID học phần' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ description: 'ID năm học' })
  @IsUUID()
  academicYearId!: string;

}

export class UpdateTimetableDto extends PartialType(CreateTimetableDto) {}

export class TimetableQueryDto {
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


export class TimetableConflictCheckDto {

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

  @ApiPropertyOptional({ description: 'ID thời khóa biểu cần loại trừ' })
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}


// DTO cho upload Excel
export class TimetableUploadDataDto {
  @ApiProperty({ description: 'Số thứ tự' })
  @IsInt()
  @Min(1)
  order!: number;

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

  @IsArray()
  @ArrayNotEmpty()
  detailTimeSlots!: DetailTimeSlotsDto[]


  @ApiProperty({ description: 'Ngày bắt đầu', example: '2025-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2025-12-20' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Giáo viên' })
  @IsString()
  lecturerName!: string;

}

export class TimetableUploadDto {

  @ApiProperty({ description: 'Danh sách dữ liệu thời khóa biểu' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableUploadDataDto)
  data!: TimetableUploadDataDto[];
}


// export class CourseResponseDto {
//   id!: string;
//   courseCode!: string;
//   courseName!: string;
//   credits!: number;
//   semester!: KyHoc;
//   description?: string
// }

// export class AcademicYearResponseDto {
//   id!: string;
//   yearCode!: string;
// }

// // không cần validate trong response
// export class TimetableResponseDto {
//   @ApiProperty({ description: 'ID' })
//   id!: string;

//   @ApiProperty({ description: 'Tên lớp học phần' })
//   className!: string;

//   @ApiProperty({ enum: KyHoc, description: 'Kỳ học' })
//   semester!: KyHoc;

//   @ApiProperty({ description: 'Hình thức học' })
//   classType!: string;

//   @ApiProperty({ description: 'Số sinh viên' })
//   studentCount!: number;

//   @ApiProperty({ description: 'Số tiết lý thuyết' })
//   theoryHours!: number;

//   @ApiProperty({ description: 'Hệ số lớp đông' })
//   crowdClassCoefficient!: number;

//   @ApiProperty({ description: 'Số tiết thực (tính hệ số)' })
//   actualHours!: number;

//   @ApiProperty({ description: 'Hệ số ngoài giờ' })
//   overtimeCoefficient!: number;

//   @ApiProperty({ description: 'Số tiết quy chuẩn' })
//   standardHours!: number;

//   @ApiProperty({ description: 'Ngày bắt đầu' })
//   startDate!: string;

//   @ApiProperty({ description: 'Ngày kết thúc' })
//   endDate!: string;

//   @ApiPropertyOptional({ description: 'Tên giảng viên' })
//   lecturerName?: string;

//   @ApiProperty({ description: 'Thông tin học phần' })
//   course!: CourseResponseDto;

//   @ApiProperty({ description: 'Thông tin năm học' })
//   academicYear!: AcademicYearResponseDto;

//   @ApiProperty({
//     description: 'Chi tiết lịch học',
//     type: [DetailTimeSlotsDto],
//   })
//   detailTimeSlots!: DetailTimeSlotsDto[];

//   @ApiPropertyOptional({ description: 'Ghi chú' })
//   notes?: string;
// }
