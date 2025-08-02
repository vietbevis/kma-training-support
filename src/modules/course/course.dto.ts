import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { KiHoc } from 'src/shared/enums/semester.enum';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Mã học phần',
    example: 'CS101',
  })
  @IsString()
  @IsNotEmpty()
  courseCode: string;

  @ApiProperty({
    description: 'Tên học phần',
    example: 'Lập trình cơ bản',
  })
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @ApiProperty({
    description: 'Số tín chỉ',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(10)
  credits: number;

  @ApiProperty({
    description: 'Kỳ học',
    enum: KiHoc,
    required: false,
  })
  @IsOptional()
  @IsEnum(KiHoc)
  semester?: KiHoc;

  @ApiProperty({
    description: 'Mô tả học phần',
    example: 'Học phần cung cấp kiến thức cơ bản về lập trình',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID khoa phụ trách',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;

  @ApiProperty({
    description: 'ID bộ môn phụ trách',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class QueryCourseDto {
  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên một trang',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Từ khóa tìm kiếm (tìm trong mã và tên học phần)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID khoa để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;

  @ApiProperty({
    description: 'ID bộ môn để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'Kỳ học để lọc',
    enum: KiHoc,
    required: false,
  })
  @IsOptional()
  @IsEnum(KiHoc)
  semester?: KiHoc;

  @ApiProperty({
    description: 'Bao gồm các bản ghi đã xóa mềm',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => {
    const val = obj[key];
    if (val === 'true' || val === '1' || val === 'yes') return true;
    if (val === 'false' || val === '0' || val === 'no') return false;
    return val;
  })
  includeDeleted?: boolean = false;
}

export class QueryCourseDeletedDto {
  @ApiProperty({
    description: 'Số trang',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Số lượng bản ghi trên một trang',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Từ khóa tìm kiếm (tìm trong mã và tên học phần)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID khoa để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;

  @ApiProperty({
    description: 'ID bộ môn để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'Kỳ học để lọc',
    enum: KiHoc,
    required: false,
  })
  @IsOptional()
  @IsEnum(KiHoc)
  semester?: KiHoc;
}

export class CourseParamDto {
  @ApiProperty({
    description: 'ID của học phần',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}
