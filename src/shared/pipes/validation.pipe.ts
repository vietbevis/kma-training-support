import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';

@Injectable()
export class ApiValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      ...options,
      // Tự động loại bỏ các field không được khai báo decorator trong DTO
      whitelist: true,
      // Nếu có field không được khai báo decorator trong DTO mà client truyền lên thì sẽ báo lỗi
      forbidNonWhitelisted: false,
      // Tự động chuyển đổi dữ liệu sang kiểu được khai báo trong DTO
      transform: true,
      // Tự động chuyển đổi dữ liệu sang kiểu được khai báo trong DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Trả về lỗi 422 nếu có lỗi validation
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      // Chuẩn hóa lỗi
      exceptionFactory: (errors: ValidationError[] = []) => {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          messages: Object.values(error.constraints ?? []),
        }));
        return new UnprocessableEntityException({
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
          errorType: 'ValidationError',
        });
      },
    });
  }
}
