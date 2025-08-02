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
  CreateEducationalSystemDto,
  EducationalSystemParamDto,
  QueryEducationalSystemDeletedDto,
  QueryEducationalSystemDto,
  QueryEducationalSystemOptionsDto,
  UpdateEducationalSystemDto,
} from './educational-system.dto';
import { EducationalSystemService } from './educational-system.service';

@ApiTags('Hệ đào tạo')
@Controller('educational-systems')
export class EducationalSystemController {
  constructor(
    private readonly educationalSystemService: EducationalSystemService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hệ đào tạo mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEducationalSystemDto: CreateEducationalSystemDto) {
    return this.educationalSystemService.create(createEducationalSystemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hệ đào tạo' })
  findAll(@Query() queryDto: QueryEducationalSystemDto) {
    return this.educationalSystemService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách hệ đào tạo đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryEducationalSystemDeletedDto) {
    return this.educationalSystemService.getDeletedRecords(queryDto);
  }

  @Get('options')
  @ApiOperation({
    summary: 'Lấy danh sách options hệ đào tạo (educationLevels và tuitions)',
  })
  getOptions(@Query() queryDto: QueryEducationalSystemOptionsDto) {
    return this.educationalSystemService.getOptions(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết hệ đào tạo' })
  findOne(@Param() params: EducationalSystemParamDto) {
    return this.educationalSystemService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hệ đào tạo' })
  update(
    @Param() params: EducationalSystemParamDto,
    @Body() updateEducationalSystemDto: UpdateEducationalSystemDto,
  ) {
    return this.educationalSystemService.update(
      params.id,
      updateEducationalSystemDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm hệ đào tạo' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: EducationalSystemParamDto) {
    return this.educationalSystemService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn hệ đào tạo' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: EducationalSystemParamDto) {
    return this.educationalSystemService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục hệ đào tạo đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: EducationalSystemParamDto) {
    return this.educationalSystemService.restore(params.id);
  }
}
