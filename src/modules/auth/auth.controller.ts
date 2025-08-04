import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Public } from 'src/shared/decorators/public.decorator';
import {
  LoginDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Đăng nhập với username và password',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới cặp access token và refresh token',
    description:
      'Sử dụng refresh token để lấy cặp access token và refresh token mới',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<RefreshTokenResponseDto> {
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');

    return this.authService.refreshToken(refreshTokenDto, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Thu hồi refresh token hiện tại',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lấy thông tin user hiện tại',
    description: 'Lấy thông tin user từ access token',
  })
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
