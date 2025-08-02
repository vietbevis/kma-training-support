import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      FacultyDepartmentEntity,
      SubjectEntity,
      AcademicCredentialsEntity,
      ExemptionPercentageEntity,
      RoleEntity,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
