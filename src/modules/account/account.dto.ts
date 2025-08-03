import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';

export class UpdateAccountDto {
  @ApiProperty({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiProperty({
    description: 'Mật khẩu mới',
    example: 'newpassword123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ApiProperty({
    description: 'ID các vai trò',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class QueryAccountDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong họ tên, mã nhân viên, username)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'ID phòng ban/khoa để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;

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

export class AccountParamDto {
  @ApiProperty({
    description: 'ID của tài khoản',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}
