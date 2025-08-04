import { AuditableEntity } from 'src/database/base/auditable.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { FacultyDepartmentEntity } from './faculty-department.entity';
import { PermissionEntity } from './permission.entity';

@Entity('tbl_roles')
export class RoleEntity extends AuditableEntity {
  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', name: 'description', default: '' })
  description: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', name: 'is_system_role', default: false })
  isSystemRole: boolean;

  @Column({ name: 'scope_faculty_department_id', nullable: true })
  scopeFacultyDepartmentId: string;

  @ManyToOne(() => FacultyDepartmentEntity)
  @JoinColumn({ name: 'scope_faculty_department_id' })
  scopeFacultyDepartment: FacultyDepartmentEntity;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({ name: 'tbl_role_permissions' })
  permissions: PermissionEntity[];
}
