import { AuditableEntity } from 'src/database/base/auditable.entity';
import { Column, Entity } from 'typeorm';

@Entity('tbl_faculty_departments')
export class FacultyDepartmentEntity extends AuditableEntity {
  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: '' })
  description?: string;

  @Column({ type: 'boolean', name: 'is_faculty', default: false })
  isFaculty: boolean;
}
