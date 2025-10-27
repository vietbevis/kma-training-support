import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor() {}

  catch(exception: any, host: ArgumentsHost) {
    Logger.error(exception);
    if (!exception) return;
    const apiResponse = ApiExceptionFilter.handleException(exception);
    Logger.error(apiResponse);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response
      .status(exception?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR)
      .json(apiResponse);
  }

  static handleException(exception: HttpException) {
    const message = exception?.message ?? 'Lỗi không xác định';

    let responseDto = {
      message,
      errors: undefined,
    };

    const exceptionResponse =
      exception instanceof HttpException ? exception?.getResponse() : null;

    if (typeof exceptionResponse === 'object') {
      if (exception?.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY) {
        responseDto = {
          ...responseDto,
          ...exceptionResponse,
        };
      }
    }

    return responseDto;
  }
}
