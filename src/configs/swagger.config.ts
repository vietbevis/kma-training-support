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
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'JWT Authorization header using the Bearer scheme',
      },
      'Authorization',
    )
    .build();
  const documentSwagger = SwaggerModule.createDocument(app, configSwagger);

  documentSwagger.paths = Object.entries(documentSwagger.paths).reduce(
    (acc, [path, pathObj]) => {
      for (const method in pathObj) {
        if (pathObj[method]?.security === undefined) {
          pathObj[method].security = [{ Authorization: [] }];
        }
      }
      acc[path] = pathObj;
      return acc;
    },
    {} as typeof documentSwagger.paths,
  );

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
