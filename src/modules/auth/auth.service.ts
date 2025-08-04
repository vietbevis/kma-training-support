import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { ConfigService } from 'src/shared/services/config.service';
import { HashingService } from 'src/shared/services/hashing.service';
import { RsaKeyManager } from 'src/shared/utils/RsaKeyManager';
import { Repository } from 'typeorm';
import { LoginDto, RefreshTokenDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly keyManager: RsaKeyManager,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { username, password } = loginDto;

    // Tìm user theo username
    const user = await this.userRepository.findOne({
      where: { username },
      relations: {
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = this.hashingService.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Tạo access token và refresh token
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(
      user,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      jwt.verify(refreshToken, this.keyManager.getPublicKeyRefresh(), {
        algorithms: ['RS256'],
      });

      // Kiểm tra refresh token trong database
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          token: this.hashToken(refreshToken),
        },
        relations: {
          user: {
            roles: true,
          },
        },
      });

      if (
        !storedToken ||
        storedToken.isRevoked ||
        storedToken.expiresAt < new Date()
      ) {
        throw new UnauthorizedException(
          'Refresh token không hợp lệ hoặc đã hết hạn',
        );
      }

      // Thu hồi refresh token cũ
      await this.refreshTokenRepository.update(
        { token: this.hashToken(refreshToken) },
        { isRevoked: true },
      );

      // Tạo cặp token mới
      const newAccessToken = this.generateAccessToken(storedToken.user);
      const newRefreshToken = await this.generateRefreshToken(
        storedToken.user,
        ipAddress,
        userAgent,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(
          'Refresh token đã hết hạn, vui lòng đăng nhập lại',
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(
          'Refresh token không hợp lệ, vui lòng đăng nhập lại',
        );
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Refresh token verification failed:', error);
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(refreshToken: string) {
    try {
      // Verify refresh token
      jwt.verify(refreshToken, this.keyManager.getPublicKeyRefresh(), {
        algorithms: ['RS256'],
      });

      // Đánh dấu refresh token là đã thu hồi
      await this.refreshTokenRepository.update(
        { token: this.hashToken(refreshToken) },
        { isRevoked: true },
      );

      return { message: 'Đăng xuất thành công' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      // Vẫn trả về thành công để không leak thông tin
      return { message: 'Đăng xuất thành công' };
    }
  }

  private generateAccessToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles.map((role) => role.name),
    };

    return jwt.sign(payload, this.keyManager.getPrivateKeyAccess(), {
      algorithm: 'RS256',
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRES_IN'),
    });
  }

  private async generateRefreshToken(
    user: UserEntity,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      jti,
    };

    const refreshToken = jwt.sign(
      payload,
      this.keyManager.getPrivateKeyRefresh(),
      {
        algorithm: 'RS256',
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN'),
      },
    );

    // Lưu refresh token vào database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: this.hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(
        Date.now() + this.configService.get('REFRESH_TOKEN_EXPIRES_IN') * 1000,
      ),
      ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return refreshToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Dọn dẹp refresh token hết hạn
  async cleanupExpiredTokens() {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: new Date(),
    });

    this.logger.log(`Đã xóa ${result.affected} refresh token hết hạn`);
  }
}
