import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { corsConfig } from './configs/cors.config';
import { configSwagger } from './configs/swagger.config';
import { ConfigService } from './shared/services/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Get config
  const API_PREFIX = configService.get('API_PREFIX');
  const API_DEFAULT_VERSION = configService.get('API_DEFAULT_VERSION');
  const PORT = configService.get('PORT');
  const API_URL = configService.get('API_URL');

  // Setup base trust proxy
  app.set('trust proxy', 1);

  // Set global prefix and versioning
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: String(API_DEFAULT_VERSION),
  });

  // Setup CORS
  app.enableCors(corsConfig(configService));

  // Setup Swagger
  const { swaggerEnabled, swaggerUrl } = configSwagger(app, configService);

  // Start server
  try {
    await app.listen(PORT);
    Logger.log(`Server is running on ${API_URL}`, 'Bootstrap');
    if (swaggerEnabled) {
      Logger.log(`Swagger is running on ${swaggerUrl}`, 'Bootstrap');
    }
  } catch (error) {
    Logger.error(error, 'Bootstrap');
    process.exit(1);
  }
}
bootstrap();
