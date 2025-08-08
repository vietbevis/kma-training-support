import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.log(`Đã xóa ${result.affected} refresh token hết hạn`);
    } catch (error) {
      this.logger.error('Lỗi khi dọn dẹp refresh token:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupRevokedTokens() {
    try {
      const result = await this.refreshTokenRepository.delete({
        isRevoked: true,
      });

      this.logger.log(`Đã xóa ${result.affected} refresh token đã thu hồi`);
    } catch (error) {
      this.logger.error('Lỗi khi dọn dẹp refresh token đã thu hồi:', error);
    }
  }
}
