import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { KyHoc } from 'src/shared/enums/semester.enum';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { FacultyDepartmentEntity } from './faculty-department.entity';
import { SubjectEntity } from './subject.entity';

@Entity('tbl_courses')
export class CourseEntity extends AuditableEntity {
  @Column({
    name: 'course_code',
    unique: true,
    comment: 'Mã học phần (duy nhất)',
  })
  courseCode!: string;

  @Column({ name: 'course_name', comment: 'Tên học phần' })
  courseName!: string;

  @Column({
    name: 'credits',
    type: 'int',
    comment: 'Đơn vị học tín (số tín chỉ)',
  })
  credits!: number;

  @Column({
    name: 'semester',
    type: 'enum',
    enum: KyHoc,
    comment: 'Kỳ học trong chương trình',
    nullable: true,
  })
  semester!: KyHoc;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Mô tả môn học',
  })
  description?: string;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'faculty_department_id',
    nullable: true,
    comment: 'ID khoa phụ trách học phần này',
  })
  facultyDepartmentId!: string | null;

  @Type(() => FacultyDepartmentEntity)
  @ManyToOne(() => FacultyDepartmentEntity)
  @JoinColumn({ name: 'faculty_department_id' })
  facultyDepartment!: FacultyDepartmentEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'subject_id',
    nullable: true,
    comment: 'ID bộ môn phụ trách học phần này',
  })
  subjectId!: string | null;

  @Type(() => SubjectEntity)
  @ManyToOne(() => SubjectEntity)
  @JoinColumn({ name: 'subject_id' })
  subject!: SubjectEntity;
}
