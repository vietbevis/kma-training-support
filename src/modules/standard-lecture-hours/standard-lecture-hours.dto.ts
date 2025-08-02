import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateStandardLectureHoursDto {
  @ApiProperty({
    description: 'Số tiết giảng dạy',
    example: 8,
  })
  @IsNumber()
  @IsNotEmpty()
  lectureHours: number;

  @ApiProperty({
    description: 'Số tiết vượt giờ',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  excessHours: number;

  @ApiProperty({
    description: 'Số tiết NCKH',
    example: 4,
  })
  @IsNumber()
  @IsNotEmpty()
  researchHours: number;
}

export class UpdateStandardLectureHoursDto extends PartialType(
  CreateStandardLectureHoursDto,
) {}
