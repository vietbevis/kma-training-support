import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateLectureInvitationMoneyDto {
  @ApiProperty({
    description: 'Số tiền mời giảng',
    example: 500000,
  })
  @IsNumber()
  @IsNotEmpty()
  money: number;

  @ApiProperty({
    description: 'Hệ đào tạo',
    example: 'CQ',
  })
  @IsString()
  @IsNotEmpty()
  educationalSystem: string;

  @ApiProperty({
    description: 'ID học hàm/học vị',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  academicCredentialId: string;
}

export class UpdateLectureInvitationMoneyDto extends PartialType(
  CreateLectureInvitationMoneyDto,
) {}

export class QueryLectureInvitationMoneyDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong hệ đào tạo)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  academicCredentialId?: string;

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

export class QueryLectureInvitationMoneyDeletedDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong hệ đào tạo)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  academicCredentialId?: string;
}

export class LectureInvitationMoneyParamDto {
  @ApiProperty({
    description: 'ID của tiền mời giảng',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}
