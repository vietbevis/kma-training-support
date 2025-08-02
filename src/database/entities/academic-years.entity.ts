import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tbl_academic_years')
export class AcademicYearEntity extends AuditableEntity {
  @Column({
    name: 'year_code',
    length: 20,
    unique: true,
    comment: 'Mã năm học (VD: 2023-2024)',
  })
  yearCode!: string;
}
