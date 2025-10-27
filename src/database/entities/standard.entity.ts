import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { KyHoc } from 'src/shared/enums/semester.enum';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { AcademicYearEntity } from './academic-years.entity';
import { CourseEntity } from './course.entity';
import { TimeSlotEntity } from './timeslot.entity';

@Entity('tbl_standards')
@Unique(['className', 'semester', 'academicYearId'])
export class StandardEntity extends AuditableEntity {
  @Column({
    name: 'class_name',
    type: 'varchar',
    length: 500,
    comment:
      'Tên lớp học phần cụ thể (VD: Chuyên đề chuyên ngành chuyên sâu-1-25 (A1801))',
  })
  className!: string;

  @Column({
    type: 'enum',
    enum: KyHoc,
    comment: 'Kỳ học',
  })
  semester!: KyHoc;

  @Column({
    name: 'class_type',
    comment: 'Hình thức học (LT, TH, BT...)',
  })
  classType!: string;

  @Column({
    name: 'student_count',
    type: 'int',
    default: 0,
    comment: 'Số sinh viên đăng ký',
  })
  studentCount!: number;

  @Column({
    name: 'theory_hours',
    type: 'int',
    default: 0,
    comment: 'LL',
  })
  theoryHours!: number;

  @Column({
    name: 'crowd_class_coefficient',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
    comment: 'Hệ số lớp đông',
  })
  crowdClassCoefficient!: number;

  @Column({
    name: 'actual_hours',
    type: 'int',
    default: 0,
    comment: 'LL thực',
  })
  actualHours!: number;

  @Column({
    name: 'overtime_coefficient',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Hệ số ngoài giờ',
  })
  overtimeCoefficient!: number;

  @Column({
    name: 'standard_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
    comment: 'Số tiết quy chuẩn',
  })
  standardHours!: number;

  @Column({
    name: 'start_date',
    type: 'date',
    comment: 'Ngày bắt đầu',
  })
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    comment: 'Ngày kết thúc',
  })
  endDate!: Date;

  @Column({
    name: 'lecturer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Tên giảng viên trên thời khóa biểu',
  })
  lecturerName?: string;

  // Relations
  @OneToMany(() => TimeSlotEntity, (timeSlot) => timeSlot.timetable, {
    cascade: true,
    eager: false,
  })
  timeSlots!: TimeSlotEntity[];
  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'course_id',
    comment: 'ID học phần',
  })
  courseId!: string;

  @Type(() => CourseEntity)
  @ManyToOne(() => CourseEntity, { eager: true })
  @JoinColumn({ name: 'course_id' })
  course!: CourseEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'academic_year_id',
    comment: 'ID năm học',
  })
  academicYearId!: string;

  @Type(() => AcademicYearEntity)
  @ManyToOne(() => AcademicYearEntity, { eager: true })
  @JoinColumn({ name: 'academic_year_id' })
  academicYear!: AcademicYearEntity;
}
