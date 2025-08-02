import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandardLectureHoursEntity } from 'src/database/entities/standard-lecture-hours.entity';
import { StandardLectureHoursController } from './standard-lecture-hours.controller';
import { StandardLectureHoursService } from './standard-lecture-hours.service';

@Module({
  imports: [TypeOrmModule.forFeature([StandardLectureHoursEntity])],
  controllers: [StandardLectureHoursController],
  providers: [StandardLectureHoursService],
  exports: [StandardLectureHoursService],
})
export class StandardLectureHoursModule {}
