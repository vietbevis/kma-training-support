import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { BuildingEntity } from './building.entity';

@Entity('tbl_classrooms')
@Unique(['name', 'buildingId'])
export class ClassroomEntity extends AuditableEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    nullable: false,
    comment: 'Tên phòng học',
  })
  name!: string;

  @Column({
    name: 'type',
    type: 'varchar',
    nullable: false,
    comment: 'Loại phòng học',
  })
  type!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Mô tả',
  })
  description?: string;

  @Exclude()
  @ApiHideProperty()
  @Column({
    name: 'building_id',
    nullable: false,
    comment: 'ID tòa nhà',
  })
  buildingId!: string;

  @ManyToOne(() => BuildingEntity, { onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: BuildingEntity;
}
