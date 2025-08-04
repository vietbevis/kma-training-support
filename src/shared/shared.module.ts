import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import envConfig from 'src/configs/env.config';
import { ApiExceptionFilter } from './filters/api-exception.filter';
import { AuthGuard } from './guards/auth.guard';
import { ApiValidationPipe } from './pipes/validation.pipe';
import { ConfigService } from './services/config.service';
import { HashingService } from './services/hashing.service';
import { RsaKeyManager } from './utils/RsaKeyManager';

const services = [ConfigService, HashingService, RsaKeyManager];

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  providers: [
    ...services,
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ApiValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [...services],
})
export class SharedModule {}
