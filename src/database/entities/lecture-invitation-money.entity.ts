import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { AcademicCredentialsEntity } from './academic-credentials.entity';

@Entity('tbl_lecture_invitation_money')
export class LectureInvitationMoneyEntity extends AuditableEntity {
  @Column({
    name: 'money',
    type: 'decimal',
    nullable: false,
  })
  money!: number;

  @Column({
    name: 'educational_system',
    type: 'varchar',
    nullable: false,
  })
  educationalSystem!: string;

  @Column({
    name: 'academic_credential_id',
    nullable: false,
  })
  academicCredentialId!: string;

  @ManyToOne(() => AcademicCredentialsEntity)
  @JoinColumn({ name: 'academic_credential_id' })
  academicCredential!: AcademicCredentialsEntity;
}
