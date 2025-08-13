import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { FileUploadResponseDto } from 'src/modules/files/files.dto';
import { Gender } from 'src/shared/enums/gender.enum';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { AuditableEntity } from '../base/auditable.entity';
import { AcademicCredentialsEntity } from './academic-credentials.entity';
import { ExemptionPercentageEntity } from './exemption-percentage.entity';
import { FacultyDepartmentEntity } from './faculty-department.entity';
import { RoleEntity } from './role.entity';
import { SubjectEntity } from './subject.entity';

@Entity('tbl_users')
export class UserEntity extends AuditableEntity {
  @Column({ name: 'full_name', comment: 'Họ và tên' })
  fullName!: string;

  @Column({ type: 'varchar', unique: true, comment: 'Tên đăng nhập' })
  username: string;

  @Column({
    name: 'code',
    unique: true,
    length: 50,
    comment: 'Mã nhân viên duy nhất',
  })
  code!: string;

  @Exclude()
  @ApiHideProperty()
  @Column({ type: 'varchar', comment: 'Mật khẩu' })
  password: string;

  @Column({
    name: 'gender',
    type: 'enum',
    enum: Gender,
    comment: 'Giới tính',
    default: Gender.OTHER,
  })
  gender!: Gender;

  @Column({
    name: 'date_of_birth',
    type: 'timestamptz',
    nullable: true,
    comment: 'Ngày sinh',
  })
  dateOfBirth?: Date;

  @Column({
    name: 'phone',
    length: 20,
    nullable: true,
    comment: 'Số điện thoại',
  })
  phone?: string;

  @Column({
    name: 'email',
    length: 255,
    nullable: true,
    comment: 'Địa chỉ email',
  })
  email?: string;

  @Column({
    name: 'work_place',
    type: 'text',
    nullable: true,
    comment: 'Nơi công tác',
  })
  workPlace?: string;

  @Column({
    name: 'citizen_id',
    length: 50,
    comment: 'Căn cước công dân (bắt buộc)',
  })
  citizenId?: string;

  @Column({
    name: 'citizen_id_issue_date',
    type: 'timestamptz',
    nullable: true,
    comment: 'Ngày cấp CCCD',
  })
  citizenIdIssueDate?: Date;

  @Column({
    name: 'citizen_id_issue_place',
    length: 255,
    nullable: true,
    comment: 'Nơi cấp CCCD',
  })
  citizenIdIssuePlace?: string;

  @Column({
    name: 'citizen_id_front',
    type: 'jsonb',
    nullable: true,
    comment: 'Tệp hình ảnh CCCD trước',
  })
  citizenIdFront?: FileUploadResponseDto;

  @Column({
    name: 'citizen_id_back',
    type: 'jsonb',
    nullable: true,
    comment: 'Tệp hình ảnh CCCD sau',
  })
  citizenIdBack?: FileUploadResponseDto;

  @Column({
    name: 'citizen_id_address',
    type: 'text',
    nullable: true,
    comment: 'Địa chỉ trên CCCD',
  })
  citizenIdAddress?: string;

  @Column({
    name: 'current_address',
    type: 'text',
    nullable: true,
    comment: 'Địa chỉ hiện tại',
  })
  currentAddress?: string;

  @Column({
    type: 'boolean',
    name: 'are_teaching',
    default: true,
    comment: 'Tình trạng giảng dạy',
  })
  areTeaching: boolean;

  @Column({
    type: 'decimal',
    name: 'salary_coefficient',
    default: 0,
    comment: 'Hệ số lương',
  })
  salaryCoefficient: number;

  @Column({
    type: 'decimal',
    name: 'salary',
    default: 0,
    comment: 'Lương',
  })
  salary: number;

  @Column({
    type: 'varchar',
    name: 'position',
    default: '',
    comment: 'Chức vụ',
  })
  position: string;

  @Column({
    name: 'bank_account',
    nullable: true,
    comment: 'Số tài khoản',
  })
  bankAccount: string;

  @Column({
    name: 'bank_name',
    nullable: true,
    comment: 'Tên ngân hàng',
  })
  bankName: string;

  @Column({
    name: 'bank_branch',
    nullable: true,
    comment: 'Chi nhánh',
  })
  bankBranch: string;

  @Column({
    name: 'tax_code',
    nullable: true,
    comment: 'Mã số thuế',
  })
  taxCode: string;

  @Column({
    name: 'profile_file',
    type: 'jsonb',
    nullable: true,
    comment: 'Tệp lí lịch cá nhân',
  })
  profileFile: FileUploadResponseDto;

  @Column({
    name: 'exemption_percentage_id',
    comment: 'Phần trăm miễn giảm',
    nullable: true,
  })
  exemptionPercentageId: string | null;

  @ManyToOne(() => ExemptionPercentageEntity)
  @JoinColumn({ name: 'exemption_percentage_id' })
  exemptionPercentage: ExemptionPercentageEntity;

  @ApiHideProperty()
  @Exclude()
  @Column({
    type: 'varchar',
    name: 'subject_id',
    nullable: true,
    comment: 'Bộ môn (null nếu nhân viên thuộc khoa)',
  })
  subjectId: string | null;

  @ManyToOne(() => SubjectEntity)
  @JoinColumn({ name: 'subject_id' })
  subject: SubjectEntity;

  @ApiHideProperty()
  @Exclude()
  @Column({
    type: 'varchar',
    name: 'academic_credential_id',
    comment: 'Học hàm/học vị',
  })
  academicCredentialId: string;

  @ManyToOne(() => AcademicCredentialsEntity)
  @JoinColumn({ name: 'academic_credential_id' })
  academicCredential: AcademicCredentialsEntity;

  @Exclude()
  @ApiHideProperty()
  @Column({ type: 'varchar', name: 'faculty_department_id' })
  facultyDepartmentId: string;

  @ManyToOne(() => FacultyDepartmentEntity)
  @JoinColumn({ name: 'faculty_department_id' })
  facultyDepartment: FacultyDepartmentEntity;

  @ManyToMany(() => RoleEntity)
  @JoinTable({ name: 'tbl_user_roles' })
  roles: RoleEntity[];

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: UserEntity;
}
