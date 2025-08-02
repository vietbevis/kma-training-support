import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
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
import { Gender } from 'src/shared/enums/gender.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Tên đăng nhập',
    example: 'nguyenvana',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Mã nhân viên',
    example: 'NV001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Mật khẩu',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Giới tính',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiProperty({
    description: 'Ngày sinh',
    example: '1990-01-01',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({
    description: 'Số điện thoại',
    example: '0123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Email',
    example: 'nguyenvana@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Nơi công tác',
    example: 'Trường Đại học ABC',
    required: false,
  })
  @IsOptional()
  @IsString()
  workPlace?: string;

  @ApiProperty({
    description: 'Căn cước công dân',
    example: '123456789012',
    required: false,
  })
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiProperty({
    description: 'Ngày cấp CCCD',
    example: '2020-01-01',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  citizenIdIssueDate?: Date;

  @ApiProperty({
    description: 'Nơi cấp CCCD',
    example: 'Công an quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  citizenIdIssuePlace?: string;

  @ApiProperty({
    description: 'Địa chỉ trên CCCD',
    example: '123 Đường ABC, Quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  citizenIdAddress?: string;

  @ApiProperty({
    description: 'Địa chỉ hiện tại',
    example: '456 Đường XYZ, Quận 2, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiProperty({
    description: 'Tình trạng giảng dạy',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  areTeaching?: boolean = true;

  @ApiProperty({
    description: 'Hệ số lương',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryCoefficient?: number = 0;

  @ApiProperty({
    description: 'Lương',
    example: 5000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number = 0;

  @ApiProperty({
    description: 'Chức vụ',
    example: 'Giảng viên',
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string = '';

  @ApiProperty({
    description: 'Số tài khoản',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({
    description: 'Tên ngân hàng',
    example: 'Vietcombank',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    description: 'Chi nhánh ngân hàng',
    example: 'Chi nhánh TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiProperty({
    description: 'ID phần trăm miễn giảm',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  exemptionPercentageId?: string;

  @ApiProperty({
    description: 'ID bộ môn (bắt buộc nếu thuộc khoa)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  academicCredentialId: string;

  @ApiProperty({
    description: 'ID phòng ban/khoa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  facultyDepartmentId: string;

  @ApiProperty({
    description: 'ID các vai trò',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class QueryUserDto {
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
    description: 'ID bộ môn để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  academicCredentialId?: string;

  @ApiProperty({
    description: 'Giới tính để lọc',
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: 'Tình trạng giảng dạy để lọc',
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
  areTeaching?: boolean;

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

export class QueryUserDeletedDto {
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
    description: 'ID bộ môn để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị để lọc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  academicCredentialId?: string;

  @ApiProperty({
    description: 'Giới tính để lọc',
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: 'Tình trạng giảng dạy để lọc',
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
  areTeaching?: boolean;
}

export class UserParamDto {
  @ApiProperty({
    description: 'ID của nhân viên',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}
