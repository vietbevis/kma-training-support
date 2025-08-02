import { Transform, plainToClass } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

export const NodeEnv = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

export class EnvironmentValidation {
  // Application
  @IsEnum(NodeEnv)
  @Transform(({ value }) => value || NodeEnv.DEVELOPMENT)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 4000))
  PORT: number = 4000;

  @IsString()
  @Transform(({ value }) => value.trim().replace(/^\/+|\/+$/g, '') || 'api')
  API_PREFIX: string;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  API_DEFAULT_VERSION: number;

  @IsString()
  API_URL: string;

  // Database
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 3306))
  DB_PORT: number = 3306;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // Minio
  @IsString()
  MINIO_HOST: string;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 9000))
  MINIO_PORT: number = 9000;

  @IsBoolean()
  MINIO_USE_SSL: boolean = false;

  @IsString()
  MINIO_ACCESSKEY: string;

  @IsString()
  MINIO_SECRETKEY: string;

  @IsString()
  MINIO_BUCKET_NAME: string;

  // Swagger
  @IsString()
  SWAGGER_TITLE: string;

  @IsString()
  SWAGGER_DESCRIPTION: string;

  @IsString()
  SWAGGER_VERSION: string;

  @IsString()
  @Transform(({ value }) => value.trim().replace(/^\/+|\/+$/g, '') || 'docs')
  SWAGGER_UI_PATH: string;

  // JWT (Tính theo giây)
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 300))
  ACCESS_TOKEN_EXPIRES_IN: number;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 3600))
  REFRESH_TOKEN_EXPIRES_IN: number;

  // RSA Key
  @IsString()
  JWT_KEY_DIRECTORY: string;

  @IsString()
  JWT_PRIVATE_ACCESS: string;

  @IsString()
  JWT_PUBLIC_ACCESS: string;

  @IsString()
  JWT_PRIVATE_REFRESH: string;

  @IsString()
  JWT_PUBLIC_REFRESH: string;
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentValidation, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    errors.map((error) =>
      console.error(
        '❌ Biến môi trường không hợp lệ:',
        Object.values(error.constraints ?? {}).join(', '),
      ),
    );
    throw new Error('Biến môi trường không hợp lệ');
  }

  return validatedConfig;
}

export type EnvironmentVariables = EnvironmentValidation;

export default () => {
  try {
    const env = validateConfig(process.env);
    return env;
  } catch (error) {
    console.error('❌ Biến môi trường không hợp lệ:', error);
    throw new Error('Biến môi trường không hợp lệ');
  }
};
