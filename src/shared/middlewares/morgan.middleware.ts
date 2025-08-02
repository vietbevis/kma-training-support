import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as morgan from 'morgan';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    morgan('dev', {
      stream: {
        write: (message) => Logger.log(message.trim(), 'HTTP'),
      },
    })(req, res, next);
  }
}
