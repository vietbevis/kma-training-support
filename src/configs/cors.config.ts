import { BadRequestException } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from 'src/shared/services/config.service';

export const corsConfig = (configService: ConfigService): CorsOptions => {
  const whitelist = [
    configService.get('API_URL'),
    configService.get('CLIENT_URL'),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ];
  return {
    origin: (origin: string, callback: Function) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException(
            `CORS error: Origin '${origin}' is not allowed.`,
          ),
        );
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization', 'Content-Disposition'],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 3600,
  };
};
