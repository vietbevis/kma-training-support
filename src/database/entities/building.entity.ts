import { Column, Entity, OneToMany } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { ClassroomEntity } from './classrooms.entity';

@Entity('tbl_buildings')
export class BuildingEntity extends AuditableEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    unique: true,
    nullable: false,
    comment: 'Tên tòa nhà',
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Mô tả',
  })
  description?: string;

  @OneToMany(() => ClassroomEntity, (classroom) => classroom.building, {
    cascade: true,
  })
  classrooms!: ClassroomEntity[];
}
