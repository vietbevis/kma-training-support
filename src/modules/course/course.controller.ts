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
  CourseParamDto,
  CreateCourseDto,
  QueryCourseDeletedDto,
  QueryCourseDto,
  UpdateCourseDto,
} from './course.dto';
import { CourseService } from './course.service';

@ApiTags('Học phần')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo học phần mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách học phần' })
  findAll(@Query() queryDto: QueryCourseDto) {
    return this.courseService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách học phần đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryCourseDeletedDto) {
    return this.courseService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết học phần' })
  findOne(@Param() params: CourseParamDto) {
    return this.courseService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật học phần' })
  update(
    @Param() params: CourseParamDto,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.courseService.update(params.id, updateCourseDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm học phần' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: CourseParamDto) {
    return this.courseService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn học phần' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: CourseParamDto) {
    return this.courseService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục học phần đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: CourseParamDto) {
    return this.courseService.restore(params.id);
  }
}
