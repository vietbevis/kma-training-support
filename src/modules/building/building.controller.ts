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
  BuildingParamDto,
  CreateBuildingDto,
  QueryBuildingDeletedDto,
  QueryBuildingDto,
  UpdateBuildingDto,
} from './building.dto';
import { BuildingService } from './building.service';

@ApiTags('Tòa nhà')
@Controller('buildings')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tòa nhà mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBuildingDto: CreateBuildingDto) {
    return this.buildingService.create(createBuildingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tòa nhà' })
  findAll(@Query() queryDto: QueryBuildingDto) {
    return this.buildingService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách tòa nhà đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryBuildingDeletedDto) {
    return this.buildingService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tòa nhà' })
  findOne(@Param() params: BuildingParamDto) {
    return this.buildingService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tòa nhà' })
  update(
    @Param() params: BuildingParamDto,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingService.update(params.id, updateBuildingDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm tòa nhà' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: BuildingParamDto) {
    return this.buildingService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn tòa nhà' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: BuildingParamDto) {
    return this.buildingService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục tòa nhà đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: BuildingParamDto) {
    return this.buildingService.restore(params.id);
  }
}
