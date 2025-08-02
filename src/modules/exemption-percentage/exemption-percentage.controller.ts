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
  CreateExemptionPercentageDto,
  ExemptionPercentageParamDto,
  QueryExemptionPercentageDeletedDto,
  QueryExemptionPercentageDto,
  UpdateExemptionPercentageDto,
} from './exemption-percentage.dto';
import { ExemptionPercentageService } from './exemption-percentage.service';

@ApiTags('Phần trăm miễn giảm')
@Controller('exemption-percentages')
export class ExemptionPercentageController {
  constructor(
    private readonly exemptionPercentageService: ExemptionPercentageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phần trăm miễn giảm mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createExemptionPercentageDto: CreateExemptionPercentageDto) {
    return this.exemptionPercentageService.create(createExemptionPercentageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phần trăm miễn giảm' })
  findAll(@Query() queryDto: QueryExemptionPercentageDto) {
    return this.exemptionPercentageService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách phần trăm miễn giảm đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryExemptionPercentageDeletedDto) {
    return this.exemptionPercentageService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết phần trăm miễn giảm' })
  findOne(@Param() params: ExemptionPercentageParamDto) {
    return this.exemptionPercentageService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật phần trăm miễn giảm' })
  update(
    @Param() params: ExemptionPercentageParamDto,
    @Body() updateExemptionPercentageDto: UpdateExemptionPercentageDto,
  ) {
    return this.exemptionPercentageService.update(
      params.id,
      updateExemptionPercentageDto,
    );
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm phần trăm miễn giảm' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: ExemptionPercentageParamDto) {
    return this.exemptionPercentageService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn phần trăm miễn giảm' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: ExemptionPercentageParamDto) {
    return this.exemptionPercentageService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục phần trăm miễn giảm đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: ExemptionPercentageParamDto) {
    return this.exemptionPercentageService.restore(params.id);
  }
}
