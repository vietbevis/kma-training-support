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
  AcademicYearParamDto,
  CreateAcademicYearDto,
  QueryAcademicYearDeletedDto,
  QueryAcademicYearDto,
  UpdateAcademicYearDto,
} from './academic-years.dto';
import { AcademicYearsService } from './academic-years.service';

@ApiTags('Năm học')
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo năm học mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.academicYearsService.create(createAcademicYearDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách năm học' })
  findAll(@Query() queryDto: QueryAcademicYearDto) {
    return this.academicYearsService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách năm học đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryAcademicYearDeletedDto) {
    return this.academicYearsService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết năm học' })
  findOne(@Param() params: AcademicYearParamDto) {
    return this.academicYearsService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật năm học' })
  update(
    @Param() params: AcademicYearParamDto,
    @Body() updateAcademicYearDto: UpdateAcademicYearDto,
  ) {
    return this.academicYearsService.update(params.id, updateAcademicYearDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm năm học' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: AcademicYearParamDto) {
    return this.academicYearsService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn năm học' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: AcademicYearParamDto) {
    return this.academicYearsService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục năm học đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: AcademicYearParamDto) {
    return this.academicYearsService.restore(params.id);
  }
}
