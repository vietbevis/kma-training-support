import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tbl_standard_lecture_hours')
export class StandardLectureHoursEntity extends AuditableEntity {
  @Column({
    name: 'lecture_hours',
    type: 'decimal',
    nullable: false,
    comment: 'Số tiết giảng dạy',
  })
  lectureHours!: number;

  @Column({
    name: 'excess_hours',
    type: 'decimal',
    nullable: false,
    comment: 'Số tiết vượt giờ',
  })
  excessHours!: number;

  @Column({
    name: 'research_hours',
    type: 'decimal',
    nullable: false,
    comment: 'Số tiết NCKH',
  })
  researchHours!: number;
}
