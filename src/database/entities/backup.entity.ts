import { BackupStatus, BackupType } from 'src/shared/enums/backup.enum';
import { Column, Entity, Index } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tbl_backups')
@Index(['status'])
@Index(['createdAt'])
export class BackupEntity extends AuditableEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PENDING,
  })
  status: BackupStatus;

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.MANUAL,
  })
  type: BackupType;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true, name: 'minio_bucket' })
  minioBucket: string;

  @Column({ nullable: true, name: 'minio_object_key' })
  minioObjectKey: string;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true, name: 'completed_at' })
  completedAt: Date;
}
