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

/**
 * Lúc phân tích mà có cả roomName và buildingName thì check trong db có phòng học đó chưa nếu chưa thì tạo mới, nếu cả toà nhà và phòng học chưa có thì tạo mới cả toà nhà và phòng học
 * Lúc phân tích mà chỉ có roomName thì mặc định check phòng học đó có trong danh sách các phòng học của toà nhà Chung chưa nếu chưa thì tạo mới
 */
