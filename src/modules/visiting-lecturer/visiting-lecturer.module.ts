import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { VisitingLecturerEntity } from 'src/database/entities/visiting-lecturer.entity';
import { VisitingLecturerController } from './visiting-lecturer.controller';
import { VisitingLecturerService } from './visiting-lecturer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitingLecturerEntity,
      FacultyDepartmentEntity,
      SubjectEntity,
      AcademicCredentialsEntity,
      ExemptionPercentageEntity,
    ]),
  ],
  controllers: [VisitingLecturerController],
  providers: [VisitingLecturerService],
  exports: [VisitingLecturerService],
})
export class VisitingLecturerModule {}
