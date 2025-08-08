import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EducationLevels } from 'src/shared/enums/education-levels.enum';
import { Tuitions } from 'src/shared/enums/tuitions.enum';

export class CreateEducationalSystemDto {
  @ApiProperty({
    description: 'Mã hệ đào tạo',
    example: 'CQ',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Tên lớp',
    example: 'Lớp CQ2023',
  })
  @IsString()
  @IsNotEmpty()
  nameClass: string;

  @ApiProperty({
    description: 'Trình độ đào tạo',
    enum: EducationLevels,
  })
  @IsEnum(EducationLevels)
  @IsNotEmpty()
  educationLevels: EducationLevels;

  @ApiProperty({
    description: 'Học phí',
    enum: Tuitions,
  })
  @IsEnum(Tuitions)
  @IsNotEmpty()
  tuitions: Tuitions;

  @ApiProperty({
    description: 'Loại sinh viên',
    example: 'Sinh viên chính quy',
  })
  @IsString()
  @IsNotEmpty()
  studentCategory: string;
}

export class UpdateEducationalSystemDto extends PartialType(
  CreateEducationalSystemDto,
) {}

export class QueryEducationalSystemDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong mã, tên lớp và loại sinh viên)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Trình độ đào tạo để lọc',
    enum: EducationLevels,
    required: false,
  })
  @IsOptional()
  @IsEnum(EducationLevels)
  educationLevels?: EducationLevels;

  @ApiProperty({
    description: 'Học phí để lọc',
    enum: Tuitions,
    required: false,
  })
  @IsOptional()
  @IsEnum(Tuitions)
  tuitions?: Tuitions;

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

export class QueryEducationalSystemDeletedDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong mã, tên lớp và loại sinh viên)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Trình độ đào tạo để lọc',
    enum: EducationLevels,
    required: false,
  })
  @IsOptional()
  @IsEnum(EducationLevels)
  educationLevels?: EducationLevels;

  @ApiProperty({
    description: 'Học phí để lọc',
    enum: Tuitions,
    required: false,
  })
  @IsOptional()
  @IsEnum(Tuitions)
  tuitions?: Tuitions;
}

export class EducationalSystemParamDto {
  @ApiProperty({
    description: 'ID của hệ đào tạo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}

export class QueryEducationalSystemOptionsDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong mã, tên lớp và loại sinh viên)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
