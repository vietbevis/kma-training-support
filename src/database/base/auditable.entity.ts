import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export abstract class AuditableEntity {
  @ApiProperty({
    description: 'ID của đối tượng',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @ApiHideProperty()
  @VersionColumn()
  version: number;

  @ApiProperty({
    description: 'Ngày tạo',
    example: '2021-01-01T00:00:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Ngày cập nhật',
    example: '2021-01-01T00:00:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Exclude()
  @ApiHideProperty()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  @Exclude()
  @ApiHideProperty()
  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string;

  @Exclude()
  @ApiHideProperty()
  @Column({ type: 'uuid', name: 'updated_by_id', nullable: true })
  updatedById: string;
}
