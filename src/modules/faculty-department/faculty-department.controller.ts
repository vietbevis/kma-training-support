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
  CreateFacultyDepartmentDto,
  FacultyDepartmentParamDto,
  QueryFacultyDepartmentDeletedDto,
  QueryFacultyDepartmentDto,
  UpdateFacultyDepartmentDto,
} from './faculty-department.dto';
import { FacultyDepartmentService } from './faculty-department.service';

@ApiTags('Khoa/Phòng ban')
@Controller('faculty-departments')
export class FacultyDepartmentController {
  constructor(
    private readonly facultyDepartmentService: FacultyDepartmentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo khoa/phòng ban mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createFacultyDepartmentDto: CreateFacultyDepartmentDto) {
    return this.facultyDepartmentService.create(createFacultyDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khoa/phòng ban' })
  findAll(@Query() queryDto: QueryFacultyDepartmentDto) {
    return this.facultyDepartmentService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách khoa/phòng ban đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryFacultyDepartmentDeletedDto) {
    return this.facultyDepartmentService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết khoa/phòng ban' })
  findOne(@Param() params: FacultyDepartmentParamDto) {
    return this.facultyDepartmentService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật khoa/phòng ban' })
  update(
    @Param() params: FacultyDepartmentParamDto,
    @Body() updateFacultyDepartmentDto: UpdateFacultyDepartmentDto,
  ) {
    return this.facultyDepartmentService.update(
      params.id,
      updateFacultyDepartmentDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm khoa/phòng ban' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: FacultyDepartmentParamDto) {
    return this.facultyDepartmentService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn khoa/phòng ban' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: FacultyDepartmentParamDto) {
    return this.facultyDepartmentService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục khoa/phòng ban đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: FacultyDepartmentParamDto) {
    return this.facultyDepartmentService.restore(params.id);
  }

  // @Post('merge-faculties')
  // @ApiOperation({
  //   summary: 'Gộp các khoa lại với nhau (chỉ khoa mới được gộp)',
  // })
  // @HttpCode(HttpStatus.OK)
  // mergeFaculties(@Body() mergeFacultiesDto: MergeFacultiesDto) {
  //   return this.facultyDepartmentService.mergeFaculties(mergeFacultiesDto);
  // }
}
