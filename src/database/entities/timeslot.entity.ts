import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { ClassroomEntity } from './classrooms.entity';
import { TimetableEntity } from './timetable.entity';

@Entity('tbl_timeslots')
export class TimeSlotEntity extends AuditableEntity {
  @Column({
    name: 'end_date',
    type: 'date',
    comment: 'Ngày kết thúc',
  })
  endDate!: Date;

  @Column({
    name: 'start_date',
    type: 'date',
    comment: 'Ngày bắt đầu',
  })
  startDate!: Date;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
    comment: 'Ngày trong tuần',
  })
  dayOfWeek!: DayOfWeek;

  @Column({
    name: 'time_slot',
    type: 'varchar',
    comment: 'Tiết học',
  })
  timeSlot!: string;

  @Column({
    name: 'classroom_id',
    type: 'varchar',
  })
  classroomId!: string;

  @ManyToOne(() => ClassroomEntity)
  @JoinColumn({ name: 'classroom_id' })
  classroom!: ClassroomEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'timetable_id',
    comment: 'ID thời khóa biểu',
  })
  timetableId!: string;

  @ManyToOne(() => TimetableEntity, (timetable) => timetable.timeSlots)
  @JoinColumn({ name: 'timetable_id' })
  timetable!: TimetableEntity;
}
