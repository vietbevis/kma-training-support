import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccountParamDto,
  QueryAccountDto,
  UpdateAccountDto,
} from './account.dto';
import { AccountService } from './account.service';

@ApiTags('Tài khoản')
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài khoản' })
  findAll(@Query() queryDto: QueryAccountDto) {
    return this.accountService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tài khoản' })
  findOne(@Param() params: AccountParamDto) {
    return this.accountService.findOne(params.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tài khoản' })
  @HttpCode(HttpStatus.OK)
  update(
    @Param() params: AccountParamDto,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountService.update(params.id, updateAccountDto);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Lấy tất cả quyền của tài khoản' })
  getAllPerrmissionOfAccount(@Param() params: AccountParamDto) {
    return this.accountService.getAllPerrmissionOfAccount(params.id);
  }
}
