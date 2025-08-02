import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AuditableEntity } from 'src/database/base/auditable.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { FacultyDepartmentEntity } from './faculty-department.entity';
import { UserEntity } from './user.entity';

@Entity('tbl_subjects')
export class SubjectEntity extends AuditableEntity {
  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: '' })
  description?: string;

  @Exclude()
  @ApiHideProperty()
  @Column({ name: 'faculty_department_id' })
  facultyDepartmentId: string;

  @ManyToOne(() => FacultyDepartmentEntity)
  @JoinColumn({ name: 'faculty_department_id' })
  facultyDepartment: FacultyDepartmentEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({ name: 'head_of_department_id', nullable: true })
  headOfDepartmentId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'head_of_department_id' })
  headOfDepartment: UserEntity;
}
