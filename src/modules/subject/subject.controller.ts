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
  CreateSubjectDto,
  QuerySubjectDeletedDto,
  QuerySubjectDto,
  SubjectParamDto,
  UpdateSubjectDto,
} from './subject.dto';
import { SubjectService } from './subject.service';

@ApiTags('Bộ môn')
@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo bộ môn mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSubjectDto: CreateSubjectDto) {
    return this.subjectService.create(createSubjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bộ môn' })
  findAll(@Query() queryDto: QuerySubjectDto) {
    return this.subjectService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách bộ môn đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QuerySubjectDeletedDto) {
    return this.subjectService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết bộ môn' })
  findOne(@Param() params: SubjectParamDto) {
    return this.subjectService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bộ môn' })
  update(
    @Param() params: SubjectParamDto,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.subjectService.update(params.id, updateSubjectDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm bộ môn' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: SubjectParamDto) {
    return this.subjectService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn bộ môn' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: SubjectParamDto) {
    return this.subjectService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục bộ môn đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: SubjectParamDto) {
    return this.subjectService.restore(params.id);
  }
}
