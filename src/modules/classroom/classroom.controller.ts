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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  BuildingClassroomAvailabilityResponseDto,
  ClassroomParamDto,
  CreateClassroomDto,
  QueryClassroomAvailabilityDto,
  QueryClassroomDeletedDto,
  QueryClassroomDto,
  UpdateClassroomDto,
} from './classroom.dto';
import { ClassroomService } from './classroom.service';

@ApiTags('Phòng học')
@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phòng học mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createClassroomDto: CreateClassroomDto) {
    return this.classroomService.create(createClassroomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng học' })
  findAll(@Query() queryDto: QueryClassroomDto) {
    return this.classroomService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách phòng học đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryClassroomDeletedDto) {
    return this.classroomService.getDeletedRecords(queryDto);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Kiểm tra tình trạng phòng học của tòa nhà theo ngày và ca học',
    description:
      'Trả về danh sách tất cả phòng học của một tòa nhà trong ngày cụ thể theo ca học bắt buộc, hiển thị phòng nào trống và phòng nào đang được sử dụng.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thành công',
    type: BuildingClassroomAvailabilityResponseDto,
  })
  async getClassroomAvailability(
    @Query() queryDto: QueryClassroomAvailabilityDto,
  ): Promise<BuildingClassroomAvailabilityResponseDto> {
    return this.classroomService.getClassroomAvailability(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết phòng học' })
  findOne(@Param() params: ClassroomParamDto) {
    return this.classroomService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật phòng học' })
  update(
    @Param() params: ClassroomParamDto,
    @Body() updateClassroomDto: UpdateClassroomDto,
  ) {
    return this.classroomService.update(params.id, updateClassroomDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm phòng học' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: ClassroomParamDto) {
    return this.classroomService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn phòng học' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: ClassroomParamDto) {
    return this.classroomService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục phòng học đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: ClassroomParamDto) {
    return this.classroomService.restore(params.id);
  }
}
