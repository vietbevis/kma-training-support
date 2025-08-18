import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetPermissionsByModuleDto,
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
  @Get('modules')
  @ApiOperation({ summary: 'Lấy danh sách các module (không phân trang)' })
  async getModules() {
    return await this.permissionService.getModules();
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

  @Get('module/:module')
  @ApiOperation({
    summary: 'Lấy danh sách quyền hạn theo module (không phân trang)',
  })
  async getPermissionsByModule(@Param() params: GetPermissionsByModuleDto) {
    return await this.permissionService.getPermissionsByModule(params.module);
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
