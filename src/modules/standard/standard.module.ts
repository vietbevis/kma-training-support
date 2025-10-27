import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { CourseEntity } from 'src/database/entities/course.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { StandardEntity } from 'src/database/entities/standard.entity';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { StandardController } from './standard.controller';
import { StandardService } from './standard.service';
import { StandardWordParserService } from './word-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StandardEntity,
      TimeSlotEntity,
      CourseEntity,
      AcademicYearEntity,
      BuildingEntity,
      ClassroomEntity,
      FacultyDepartmentEntity,
      UserEntity,
    ]),
  ],
  controllers: [StandardController],
  providers: [StandardService, StandardWordParserService],
  exports: [StandardService],
})
export class StandardModule {}
