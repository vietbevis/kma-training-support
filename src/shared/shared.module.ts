import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Client } from 'minio';
import { ClsModule } from 'nestjs-cls';
import envConfig from 'src/configs/env.config';
import { MINIO_TOKEN } from './decorators/minio.decorator';
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
    {
      inject: [ConfigService],
      provide: MINIO_TOKEN,
      useFactory: async (configService: ConfigService): Promise<Client> => {
        const client = new Client({
          endPoint: configService.get('MINIO_HOST'),
          port: configService.get('MINIO_PORT'),
          accessKey: configService.get('MINIO_ACCESSKEY'),
          secretKey: configService.get('MINIO_SECRETKEY'),
          useSSL: false,
        });
        return client;
      },
    },
  ],
  exports: [...services, MINIO_TOKEN],
})
export class SharedModule {}
