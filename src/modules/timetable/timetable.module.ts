import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { CourseEntity } from 'src/database/entities/course.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import { TimetableEntity } from 'src/database/entities/timetable.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { ExcelParserService } from './excel-parser.service';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimetableEntity,
      TimeSlotEntity,
      CourseEntity,
      AcademicYearEntity,
      BuildingEntity,
      ClassroomEntity,
      FacultyDepartmentEntity,
      UserEntity,
    ]),
  ],
  controllers: [TimetableController],
  providers: [TimetableService, ExcelParserService],
  exports: [TimetableService],
})
export class TimetableModule {}
