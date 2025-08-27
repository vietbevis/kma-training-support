import { ApiProperty } from '@nestjs/swagger';
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
import { FileUploadResponseDto } from '../files/files.dto';

export class CreateVisitingLecturerDto {
  @ApiProperty({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: 'Mã giảng viên mời',
    example: 'GVM001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

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
    description: 'Tệp hình ảnh CCCD trước',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  citizenIdFront?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Tệp hình ảnh CCCD sau',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  citizenIdBack?: FileUploadResponseDto;

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
    example: 'Giảng viên mời',
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
    description: 'Mã số thuế',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({
    description: 'Tệp lí lịch cá nhân',
    example: '123456789012',
    required: false,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  profileFile?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Bằng cấp cao nhất',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  highestDegree?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Mã QR code chuyển khoản ngân hàng',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  qrCode?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Đào tạo duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  trainingApproved?: boolean = false;

  @ApiProperty({
    description: 'Khoa duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  facultyApproved?: boolean = false;

  @ApiProperty({
    description: 'Học viện duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  academyApproved?: boolean = false;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Giảng viên mời có kinh nghiệm tốt',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

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
  @IsUUID()
  @IsNotEmpty()
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
}

export class UpdateVisitingLecturerDto {
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
    description: 'Mã giảng viên mời',
    example: 'GVM001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiProperty({
    description: 'Giới tính',
    enum: Gender,
    example: Gender.MALE,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

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
    description: 'Tệp hình ảnh CCCD trước',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  citizenIdFront?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Tệp hình ảnh CCCD sau',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  citizenIdBack?: FileUploadResponseDto;

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
  areTeaching?: boolean;

  @ApiProperty({
    description: 'Hệ số lương',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryCoefficient?: number;

  @ApiProperty({
    description: 'Lương',
    example: 5000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiProperty({
    description: 'Chức vụ',
    example: 'Giảng viên mời',
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string;

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
    description: 'Mã số thuế',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({
    description: 'Tệp lí lịch cá nhân',
    example: '123456789012',
    required: false,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  profileFile?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Bằng cấp cao nhất',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  highestDegree?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Mã QR code chuyển khoản ngân hàng',
    required: false,
    type: FileUploadResponseDto,
  })
  @IsOptional()
  @Type(() => FileUploadResponseDto)
  qrCode?: FileUploadResponseDto;

  @ApiProperty({
    description: 'Đào tạo duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  trainingApproved?: boolean;

  @ApiProperty({
    description: 'Khoa duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  facultyApproved?: boolean;

  @ApiProperty({
    description: 'Học viện duyệt',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  academyApproved?: boolean;

  @ApiProperty({
    description: 'Ghi chú',
    example: 'Giảng viên mời có kinh nghiệm tốt',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

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
  @IsNotEmpty()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'ID học hàm/học vị',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  academicCredentialId?: string;

  @ApiProperty({
    description: 'ID phòng ban/khoa',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  facultyDepartmentId?: string;
}

export class QueryVisitingLecturerDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong họ tên, mã giảng viên mời)',
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
    description: 'Đào tạo duyệt để lọc',
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
  trainingApproved?: boolean;

  @ApiProperty({
    description: 'Khoa duyệt để lọc',
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
  facultyApproved?: boolean;

  @ApiProperty({
    description: 'Học viện duyệt để lọc',
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
  academyApproved?: boolean;

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

export class QueryVisitingLecturerDeletedDto {
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
    description: 'Từ khóa tìm kiếm (tìm trong họ tên, mã giảng viên mời)',
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
    description: 'Đào tạo duyệt để lọc',
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
  trainingApproved?: boolean;

  @ApiProperty({
    description: 'Khoa duyệt để lọc',
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
  facultyApproved?: boolean;

  @ApiProperty({
    description: 'Học viện duyệt để lọc',
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
  academyApproved?: boolean;
}

export class VisitingLecturerParamDto {
  @ApiProperty({
    description: 'ID của giảng viên mời',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}

export class ApprovalActionDto {
  @ApiProperty({
    description: 'Ghi chú khi duyệt hoặc bỏ duyệt',
    example: 'Hồ sơ đã đầy đủ và phù hợp',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectionActionDto {
  @ApiProperty({
    description: 'Lý do bỏ duyệt (bắt buộc)',
    example: 'Thiếu bằng cấp chứng minh trình độ chuyên môn',
  })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
