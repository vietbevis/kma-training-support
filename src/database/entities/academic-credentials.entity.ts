import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';

@Entity('tb_academic_credentials')
export class AcademicCredentialsEntity extends AuditableEntity {
  @ApiProperty({
    description: 'Tên học hàm/học vị',
    example: 'Học hàm/học vị',
  })
  @Column({ type: 'varchar', nullable: false, unique: true })
  name: string;

  @ApiProperty({
    description: 'Mô tả',
    example: 'Mô tả',
  })
  @Column({ type: 'varchar', nullable: true, default: '' })
  description: string;
}
