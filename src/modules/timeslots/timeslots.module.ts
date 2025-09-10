import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import { TimeslotsController } from './timeslots.controller';
import { TimeslotsService } from './timeslots.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeSlotEntity])],
  providers: [TimeslotsService],
  controllers: [TimeslotsController],
})
export class TimeslotsModule {}
