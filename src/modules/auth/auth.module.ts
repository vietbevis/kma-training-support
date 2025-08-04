import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { AuthCleanupService } from './auth-cleanup.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCleanupService],
  exports: [AuthService],
})
export class AuthModule {}
