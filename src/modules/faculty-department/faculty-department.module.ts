import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { FacultyDepartmentController } from './faculty-department.controller';
import { FacultyDepartmentService } from './faculty-department.service';

@Module({
  imports: [TypeOrmModule.forFeature([FacultyDepartmentEntity, SubjectEntity])],
  controllers: [FacultyDepartmentController],
  providers: [FacultyDepartmentService],
  exports: [FacultyDepartmentService],
})
export class FacultyDepartmentModule {}
