import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetPermissionsByRoleDto,
  GetPermissionsQueryDto,
  PermissionParamDto,
  UpdatePermissionDto,
} from './permission.dto';
import { PermissionService } from './permission.service';

@ApiTags('Quyền hạn')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả quyền hạn với phân trang' })
  async findAll(@Query() queryDto: GetPermissionsQueryDto) {
    return await this.permissionService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy quyền hạn theo ID' })
  async findOne(@Param() params: PermissionParamDto) {
    return await this.permissionService.findOne(params.id);
  }

  @Get('role/:roleId')
  @ApiOperation({ summary: 'Lấy quyền hạn theo ID vai trò' })
  async findByRoleId(@Param() params: GetPermissionsByRoleDto) {
    return await this.permissionService.findByRoleId(params.roleId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tên và mô tả quyền hạn' })
  async update(
    @Param() params: PermissionParamDto,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return await this.permissionService.update(params.id, updatePermissionDto);
  }
}
