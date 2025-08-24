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
  ApprovalActionDto,
  CreateVisitingLecturerDto,
  QueryVisitingLecturerDeletedDto,
  QueryVisitingLecturerDto,
  RejectionActionDto,
  UpdateVisitingLecturerDto,
  VisitingLecturerParamDto,
} from './visiting-lecturer.dto';
import { VisitingLecturerService } from './visiting-lecturer.service';

@ApiTags('Giảng viên mời')
@Controller('visiting-lecturers')
export class VisitingLecturerController {
  constructor(
    private readonly visitingLecturerService: VisitingLecturerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo giảng viên mời mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createVisitingLecturerDto: CreateVisitingLecturerDto) {
    return this.visitingLecturerService.create(createVisitingLecturerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giảng viên mời' })
  findAll(@Query() queryDto: QueryVisitingLecturerDto) {
    return this.visitingLecturerService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách giảng viên mời đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryVisitingLecturerDeletedDto) {
    return this.visitingLecturerService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết giảng viên mời' })
  findOne(@Param() params: VisitingLecturerParamDto) {
    return this.visitingLecturerService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật giảng viên mời' })
  update(
    @Param() params: VisitingLecturerParamDto,
    @Body() updateVisitingLecturerDto: UpdateVisitingLecturerDto,
  ) {
    return this.visitingLecturerService.update(
      params.id,
      updateVisitingLecturerDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: VisitingLecturerParamDto) {
    return this.visitingLecturerService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: VisitingLecturerParamDto) {
    return this.visitingLecturerService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục giảng viên mời đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: VisitingLecturerParamDto) {
    return this.visitingLecturerService.restore(params.id);
  }

  // === APPROVAL ENDPOINTS ===

  @Post(':id/faculty-approve')
  @ApiOperation({ summary: 'Khoa duyệt giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  facultyApprove(
    @Param() params: VisitingLecturerParamDto,
    @Body() approvalDto: ApprovalActionDto,
  ) {
    return this.visitingLecturerService.facultyApprove(params.id, approvalDto);
  }

  @Post(':id/training-approve')
  @ApiOperation({ summary: 'Đào tạo duyệt giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  trainingApprove(
    @Param() params: VisitingLecturerParamDto,
    @Body() approvalDto: ApprovalActionDto,
  ) {
    return this.visitingLecturerService.trainingApprove(params.id, approvalDto);
  }

  @Post(':id/training-reject-faculty')
  @ApiOperation({ summary: 'Đào tạo bỏ duyệt của Khoa' })
  @HttpCode(HttpStatus.OK)
  trainingRejectFaculty(
    @Param() params: VisitingLecturerParamDto,
    @Body() rejectionDto: RejectionActionDto,
  ) {
    return this.visitingLecturerService.trainingRejectFaculty(
      params.id,
      rejectionDto,
    );
  }

  @Post(':id/academy-approve')
  @ApiOperation({ summary: 'Học viện duyệt giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  academyApprove(
    @Param() params: VisitingLecturerParamDto,
    @Body() approvalDto: ApprovalActionDto,
  ) {
    return this.visitingLecturerService.academyApprove(params.id, approvalDto);
  }

  @Post(':id/academy-reject-training')
  @ApiOperation({ summary: 'Học viện bỏ duyệt của Đào tạo' })
  @HttpCode(HttpStatus.OK)
  academyRejectTraining(
    @Param() params: VisitingLecturerParamDto,
    @Body() rejectionDto: RejectionActionDto,
  ) {
    return this.visitingLecturerService.academyRejectTraining(
      params.id,
      rejectionDto,
    );
  }

  @Post(':id/academy-reject-faculty')
  @ApiOperation({ summary: 'Học viện bỏ duyệt giảng viên mời' })
  @HttpCode(HttpStatus.OK)
  academyRejectFaculty(
    @Param() params: VisitingLecturerParamDto,
    @Body() rejectionDto: RejectionActionDto,
  ) {
    return this.visitingLecturerService.academyRejectFaculty(
      params.id,
      rejectionDto,
    );
  }
}
