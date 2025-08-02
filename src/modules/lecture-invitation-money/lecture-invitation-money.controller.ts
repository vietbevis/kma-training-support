import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateLectureInvitationMoneyDto,
  LectureInvitationMoneyParamDto,
  QueryLectureInvitationMoneyDeletedDto,
  QueryLectureInvitationMoneyDto,
  UpdateLectureInvitationMoneyDto,
} from './lecture-invitation-money.dto';
import { LectureInvitationMoneyService } from './lecture-invitation-money.service';

@ApiTags('Tiền mời giảng')
@Controller('lecture-invitation-money')
export class LectureInvitationMoneyController {
  constructor(
    private readonly lectureInvitationMoneyService: LectureInvitationMoneyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tiền mời giảng mới' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createLectureInvitationMoneyDto: CreateLectureInvitationMoneyDto,
  ) {
    return this.lectureInvitationMoneyService.create(
      createLectureInvitationMoneyDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tiền mời giảng' })
  findAll(@Query() queryDto: QueryLectureInvitationMoneyDto) {
    return this.lectureInvitationMoneyService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách tiền mời giảng đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryLectureInvitationMoneyDeletedDto) {
    return this.lectureInvitationMoneyService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tiền mời giảng' })
  findOne(@Param() params: LectureInvitationMoneyParamDto) {
    return this.lectureInvitationMoneyService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tiền mời giảng' })
  update(
    @Param() params: LectureInvitationMoneyParamDto,
    @Body() updateLectureInvitationMoneyDto: UpdateLectureInvitationMoneyDto,
  ) {
    return this.lectureInvitationMoneyService.update(
      params.id,
      updateLectureInvitationMoneyDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm tiền mời giảng' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: LectureInvitationMoneyParamDto) {
    return this.lectureInvitationMoneyService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn tiền mời giảng' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: LectureInvitationMoneyParamDto) {
    return this.lectureInvitationMoneyService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục tiền mời giảng đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: LectureInvitationMoneyParamDto) {
    return this.lectureInvitationMoneyService.restore(params.id);
  }
}
