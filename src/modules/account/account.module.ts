import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, FacultyDepartmentEntity, RoleEntity]),
    SharedModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
