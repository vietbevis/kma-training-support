import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateStandardLectureHoursDto } from './standard-lecture-hours.dto';
import { StandardLectureHoursService } from './standard-lecture-hours.service';

@ApiTags('Số tiết định mức')
@Controller('standard-lecture-hours')
export class StandardLectureHoursController {
  constructor(
    private readonly standardLectureHoursService: StandardLectureHoursService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin cấu hình số tiết định mức' })
  findOne() {
    return this.standardLectureHoursService.findOne();
  }

  @Put()
  @ApiOperation({
    summary: 'Cập nhật cấu hình số tiết định mức (tạo mới nếu chưa có)',
  })
  @HttpCode(HttpStatus.OK)
  update(@Body() updateStandardLectureHoursDto: UpdateStandardLectureHoursDto) {
    return this.standardLectureHoursService.update(
      updateStandardLectureHoursDto,
    );
  }
}
