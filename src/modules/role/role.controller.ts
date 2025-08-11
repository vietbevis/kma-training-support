import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserEntity } from 'src/database/entities/user.entity';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import {
  CreateRoleDto,
  GetRolesQueryDto,
  RoleParamDto,
  UpdateRoleDto,
} from './role.dto';
import { RoleService } from './role.service';

@ApiTags('Vai trò')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới vai trò' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả vai trò với phân trang và lọc' })
  async findAll(@Query() queryDto: GetRolesQueryDto) {
    return await this.roleService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy vai trò theo ID' })
  async findOne(@Param() params: RoleParamDto) {
    return await this.roleService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  async update(
    @Param() params: RoleParamDto,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: UserEntity,
  ) {
    return await this.roleService.update(
      params.id,
      updateRoleDto,
      user.roles.some((role) => role.name === 'admin'),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vai trò' })
  async remove(@Param() params: RoleParamDto) {
    return await this.roleService.remove(params.id, false);
  }
}
