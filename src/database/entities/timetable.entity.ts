import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';
import { KyHoc } from 'src/shared/enums/semester.enum';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { AcademicYearEntity } from './academic-years.entity';
import { ClassroomEntity } from './classrooms.entity';
import { CourseEntity } from './course.entity';
import { FacultyDepartmentEntity } from './faculty-department.entity';
import { UserEntity } from './user.entity';

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
    name: 'class_code',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Mã lớp học phần (VD: A1801)',
  })
  classCode?: string;

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
  @IsInt()
  @Min(0)
  studentCount!: number;

  @Column({
    name: 'theory_hours',
    type: 'int',
    default: 0,
    comment: 'Số tiết lý thuyết',
  })
  @IsInt()
  @Min(0)
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
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 0,
    comment: 'Số tiết thực (tính hệ số)',
  })
  actualHours!: number;

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
    name: 'hours_per_week',
    type: 'int',
    comment: 'Số tiết/tuần',
  })
  @IsInt()
  @Min(1)
  @Max(20)
  hoursPerWeek!: number;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
    comment: 'Thứ trong tuần (2,3,4,5,6,7,1)',
  })
  dayOfWeek!: DayOfWeek;

  @Column({
    name: 'time_slot',
    type: 'varchar',
    length: 50,
    comment: 'Tiết học (VD: "1->3", "13->16")',
  })
  timeSlot!: string;

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
    name: 'notes',
    type: 'text',
    nullable: true,
    comment: 'Ghi chú',
  })
  @IsOptional()
  @IsString()
  notes?: string;

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

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'faculty_department_id',
    nullable: true,
    comment: 'ID khoa/bộ môn',
  })
  facultyDepartmentId?: string;

  @Type(() => FacultyDepartmentEntity)
  @ManyToOne(() => FacultyDepartmentEntity, { nullable: true })
  @JoinColumn({ name: 'faculty_department_id' })
  facultyDepartment?: FacultyDepartmentEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'classroom_id',
    nullable: true,
    comment: 'ID phòng học',
  })
  classroomId?: string;

  @Type(() => ClassroomEntity)
  @ManyToOne(() => ClassroomEntity, { nullable: true })
  @JoinColumn({ name: 'classroom_id' })
  classroom?: ClassroomEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'lecturer_id',
    nullable: true,
    comment: 'ID giảng viên',
  })
  lecturerId?: string;

  @Type(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'lecturer_id' })
  lecturer?: UserEntity;

  @Column({
    name: 'room_name',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên phòng học gốc từ file Excel (VD: "503-TA1", "LMS")',
  })
  roomName?: string;
}
