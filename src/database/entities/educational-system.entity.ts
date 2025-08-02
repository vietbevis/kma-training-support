import { EducationLevels } from 'src/shared/enums/education-levels.enum';
import { Tuitions } from 'src/shared/enums/tuitions.enum';
import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tbl_educational_systems')
export class EducationalSystemEntity extends AuditableEntity {
  @Column({
    name: 'code',
    type: 'varchar',
    unique: true,
    nullable: false,
  })
  code!: string;

  @Column({
    name: 'name_class',
    type: 'varchar',
    nullable: false,
  })
  nameClass!: string;

  @Column({
    name: 'education_levels',
    type: 'enum',
    enum: EducationLevels,
    nullable: false,
  })
  educationLevels!: EducationLevels;

  @Column({
    name: 'tuitions ',
    type: 'enum',
    enum: Tuitions,
    nullable: false,
  })
  tuitions!: Tuitions;

  @Column({
    name: 'student_category',
    type: 'varchar',
    nullable: false,
  })
  studentCategory!: string;
}
