import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { RoleService } from 'src/modules/role/role.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger(bootstrap.name);

  const roleService = app.get(RoleService);

  await roleService.syncSystemRole();

  logger.log('Vai trò hệ thống đã được tạo thành công');

  // Dừng chương trình khi chạy xong
  process.exit(0);
}
bootstrap();
