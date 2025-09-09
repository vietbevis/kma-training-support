import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { KyHoc } from 'src/shared/enums/semester.enum';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { DetailTimeSlot } from '../interface/detail-time-slot.interface';
import { AcademicYearEntity } from './academic-years.entity';
import { CourseEntity } from './course.entity';

@Entity('tbl_timetables')
export class TimetableEntity extends AuditableEntity {
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
  @IsDateString()
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    comment: 'Ngày kết thúc',
  })
  @IsDateString()
  endDate!: Date;

  @Column({
    name: 'lecturer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Tên giảng viên trên thời khóa biểu',
  })
  @IsOptional()
  @IsString()
  lecturerName?: string;

  @Column({
    type: 'jsonb',
    name: 'detail_time_slots',
    nullable: false,
    comment: 'Chi tiết lịch học (mảng các slot)',
  })
  detailTimeSlots!: DetailTimeSlot[];

  // Relations
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
