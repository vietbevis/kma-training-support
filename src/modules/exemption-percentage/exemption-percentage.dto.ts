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

export class CreateExemptionPercentageDto {
  @ApiProperty({
    description: 'Phần trăm miễn giảm',
    example: 50,
  })
  @IsNumber()
  @IsNotEmpty()
  percentage: number;

  @ApiProperty({
    description: 'Lý do miễn giảm',
    example: 'Giảng viên có bằng tiến sĩ',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateExemptionPercentageDto extends PartialType(
  CreateExemptionPercentageDto,
) {}

export class QueryExemptionPercentageDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong lý do miễn giảm)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Phần trăm miễn giảm để lọc',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

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

export class QueryExemptionPercentageDeletedDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong lý do miễn giảm)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Phần trăm miễn giảm để lọc',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;
}

export class ExemptionPercentageParamDto {
  @ApiProperty({
    description: 'ID của phần trăm miễn giảm',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}
