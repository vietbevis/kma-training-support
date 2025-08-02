import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubjectEntity,
      FacultyDepartmentEntity,
      UserEntity,
    ]),
  ],
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
})
export class SubjectModule {}
