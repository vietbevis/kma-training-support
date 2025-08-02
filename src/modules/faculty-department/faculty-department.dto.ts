import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateFacultyDepartmentDto {
  @ApiProperty({
    description: 'Mã khoa/phòng ban',
    example: 'CNTT',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Tên khoa/phòng ban',
    example: 'Công nghệ thông tin',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Mô tả khoa/phòng ban',
    example: 'Khoa Công nghệ thông tin',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Có phải là khoa không (true: khoa, false: phòng ban)',
    example: true,
  })
  @IsBoolean()
  isFaculty: boolean;
}

export class UpdateFacultyDepartmentDto extends PartialType(
  CreateFacultyDepartmentDto,
) {}

export class QueryFacultyDepartmentDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong tên và mã)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo loại (true: chỉ khoa, false: chỉ phòng ban)',
    required: false,
  })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const val = obj[key];
    if (val === 'true' || val === '1' || val === 'yes') return true;
    if (val === 'false' || val === '0' || val === 'no') return false;
    return val;
  })
  @IsBoolean()
  isFaculty?: boolean;

  @ApiProperty({
    description: 'Bao gồm các bản ghi đã xóa mềm',
    required: false,
  })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const val = obj[key];
    if (val === 'true' || val === '1' || val === 'yes') return true;
    if (val === 'false' || val === '0' || val === 'no') return false;
    return val;
  })
  @IsBoolean()
  includeDeleted?: boolean = false;
}

export class QueryFacultyDepartmentDeletedDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong tên và mã)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Lọc theo loại (true: chỉ khoa, false: chỉ phòng ban)',
    required: false,
  })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const val = obj[key];
    if (val === 'true' || val === '1' || val === 'yes') return true;
    if (val === 'false' || val === '0' || val === 'no') return false;
    return val;
  })
  @IsBoolean()
  isFaculty?: boolean;
}

export class FacultyDepartmentParamDto {
  @ApiProperty({
    description: 'ID của khoa/phòng ban',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}

export class MergeFacultiesDto {
  @ApiProperty({
    description: 'Thông tin khoa mới được tạo từ việc gộp',
    example: {
      code: 'CNTT_DT',
      name: 'Khoa Công nghệ thông tin - Điện tử',
      description: 'Khoa được tạo từ việc gộp khoa CNTT và khoa Điện tử',
      isFaculty: true,
    },
  })
  @ValidateNested()
  @Type(() => CreateFacultyDepartmentDto)
  @IsNotEmpty()
  newFaculty: CreateFacultyDepartmentDto;

  @ApiProperty({
    description: 'Danh sách ID các khoa sẽ được gộp để tạo khoa mới',
    example: [
      '456e7890-e89b-12d3-a456-426614174001',
      '789e1234-e89b-12d3-a456-426614174002',
    ],
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  sourceFacultyIds: string[];

  @ApiProperty({
    description: 'Có xóa các khoa nguồn sau khi gộp không',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  deleteSourceFaculties?: boolean = true;
}
