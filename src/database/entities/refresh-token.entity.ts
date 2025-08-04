import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { UserEntity } from './user.entity';

@Entity('tbl_refresh_tokens')
export class RefreshTokenEntity extends AuditableEntity {
  @Column({
    name: 'token',
    type: 'text',
    unique: true,
    comment: 'Refresh token hash',
  })
  token: string;

  @Column({
    name: 'user_id',
    comment: 'ID của user',
  })
  userId: string;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    comment: 'Thời gian hết hạn',
  })
  expiresAt: Date;

  @Column({
    name: 'is_revoked',
    type: 'boolean',
    default: false,
    comment: 'Token đã bị thu hồi chưa',
  })
  isRevoked: boolean;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    nullable: true,
    comment: 'IP address khi tạo token',
  })
  ipAddress?: string;

  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
    comment: 'User agent khi tạo token',
  })
  userAgent?: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
