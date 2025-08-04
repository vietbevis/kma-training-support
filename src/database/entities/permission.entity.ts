import { AuditableEntity } from 'src/database/base/auditable.entity';
import { HttpMethod } from 'src/shared/enums/http-method.enum';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity('tbl_permissions')
@Index(['path', 'method'], { unique: true })
export class PermissionEntity extends AuditableEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: '' })
  description: string;

  @Column({ type: 'varchar' })
  path: string;

  @Column({ type: 'enum', enum: HttpMethod })
  method: HttpMethod;

  @Column({ type: 'varchar' })
  module: string;

  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles: RoleEntity[];
}
