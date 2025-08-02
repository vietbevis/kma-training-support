import { Injectable, NestMiddleware } from '@nestjs/common';
import * as compression from 'compression';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    compression()(req, res, next);
  }
}
