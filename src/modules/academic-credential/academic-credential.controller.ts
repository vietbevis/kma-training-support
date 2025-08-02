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
  AcademicCredentialParamDto,
  CreateAcademicCredentialDto,
  QueryAcademicCredentialDeletedDto,
  QueryAcademicCredentialDto,
  UpdateAcademicCredentialDto,
} from './academic-credential.dto';
import { AcademicCredentialService } from './academic-credential.service';

@ApiTags('Học hàm/học vị')
@Controller('academic-credentials')
export class AcademicCredentialController {
  constructor(
    private readonly academicCredentialService: AcademicCredentialService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo học hàm/học vị mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAcademicCredentialDto: CreateAcademicCredentialDto) {
    return this.academicCredentialService.create(createAcademicCredentialDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách học hàm/học vị' })
  findAll(@Query() queryDto: QueryAcademicCredentialDto) {
    return this.academicCredentialService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách học hàm/học vị đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryAcademicCredentialDeletedDto) {
    return this.academicCredentialService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết học hàm/học vị' })
  findOne(@Param() params: AcademicCredentialParamDto) {
    return this.academicCredentialService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật học hàm/học vị' })
  update(
    @Param() params: AcademicCredentialParamDto,
    @Body() updateAcademicCredentialDto: UpdateAcademicCredentialDto,
  ) {
    return this.academicCredentialService.update(
      params.id,
      updateAcademicCredentialDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm học hàm/học vị' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: AcademicCredentialParamDto) {
    return this.academicCredentialService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn học hàm/học vị' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: AcademicCredentialParamDto) {
    return this.academicCredentialService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục học hàm/học vị đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: AcademicCredentialParamDto) {
    return this.academicCredentialService.restore(params.id);
  }
}
