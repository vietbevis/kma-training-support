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
  CreateUserDto,
  QueryUserDeletedDto,
  QueryUserDto,
  UpdateUserDto,
  UserParamDto,
} from './user.dto';
import { UserService } from './user.service';

@ApiTags('Nhân viên')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên' })
  findAll(@Query() queryDto: QueryUserDto) {
    return this.userService.findAll(queryDto);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên đã xóa mềm' })
  getDeletedRecords(@Query() queryDto: QueryUserDeletedDto) {
    return this.userService.getDeletedRecords(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết nhân viên' })
  findOne(@Param() params: UserParamDto) {
    return this.userService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  update(@Param() params: UserParamDto, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(params.id, updateUserDto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Xóa mềm nhân viên' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param() params: UserParamDto) {
    return this.userService.softRemove(params.id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Xóa vĩnh viễn nhân viên' })
  @HttpCode(HttpStatus.OK)
  hardRemove(@Param() params: UserParamDto) {
    return this.userService.hardRemove(params.id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục nhân viên đã xóa mềm' })
  @HttpCode(HttpStatus.OK)
  restore(@Param() params: UserParamDto) {
    return this.userService.restore(params.id);
  }
}
