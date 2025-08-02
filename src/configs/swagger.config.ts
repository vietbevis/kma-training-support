import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from 'src/shared/services/config.service';

export const configSwagger = (
  app: INestApplication,
  configService: ConfigService,
) => {
  const API_URL = configService.get('API_URL');
  const SWAGGER_UI_ENABLED = configService.isDevelopment;
  const SWAGGER_TITLE = configService.get('SWAGGER_TITLE');
  const SWAGGER_DESCRIPTION = configService.get('SWAGGER_DESCRIPTION');
  const SWAGGER_VERSION = configService.get('SWAGGER_VERSION');
  const SWAGGER_UI_PATH = configService.get('SWAGGER_UI_PATH');

  const configSwagger = new DocumentBuilder()
    .setTitle(SWAGGER_TITLE)
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion(SWAGGER_VERSION)
    .addServer(API_URL)
    .build();
  const documentSwagger = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup(SWAGGER_UI_PATH, app, documentSwagger, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: SWAGGER_TITLE,
    swaggerUiEnabled: SWAGGER_UI_ENABLED,
  });

  return {
    swaggerEnabled: SWAGGER_UI_ENABLED,
    swaggerUrl: `${API_URL}/${SWAGGER_UI_PATH}`,
  };
};
