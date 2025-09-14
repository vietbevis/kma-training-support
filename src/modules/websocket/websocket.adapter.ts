import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { CorsOptions } from 'cors';
import { ServerOptions } from 'socket.io';
import { ConfigService } from 'src/shared/services/config.service';

export class WebsocketAdapter extends IoAdapter {
  constructor(
    private readonly app: INestApplication,
    private readonly configService: ConfigService,
    private readonly corsConfig: CorsOptions,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(this.configService.get('PORT') + 1, {
      ...options,
      cors: this.corsConfig,
    });
    return server;
  }
}
