import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tbl_exemption_percentage')
export class ExemptionPercentageEntity extends AuditableEntity {
  @Column({
    name: 'percentage',
    type: 'decimal',
    nullable: false,
    comment: 'Phần trăm miễn giảm',
  })
  percentage!: number;

  @Column({
    name: 'reason',
    type: 'varchar',
    nullable: false,
    comment: 'Lý do miễn giảm',
  })
  reason!: string;
}
