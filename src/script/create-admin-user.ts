import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Gender } from 'src/shared/enums/gender.enum';
import { SystemRole } from 'src/shared/enums/system-role';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { AcademicCredentialsEntity } from '../database/entities/academic-credentials.entity';
import { ExemptionPercentageEntity } from '../database/entities/exemption-percentage.entity';
import { FacultyDepartmentEntity } from '../database/entities/faculty-department.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepository = app.get<Repository<UserEntity>>(
    getRepositoryToken(UserEntity),
  );
  const roleRepository = app.get<Repository<RoleEntity>>(
    getRepositoryToken(RoleEntity),
  );
  const exemptionRepository = app.get<Repository<ExemptionPercentageEntity>>(
    getRepositoryToken(ExemptionPercentageEntity),
  );
  const academicRepository = app.get<Repository<AcademicCredentialsEntity>>(
    getRepositoryToken(AcademicCredentialsEntity),
  );
  const facultyRepository = app.get<Repository<FacultyDepartmentEntity>>(
    getRepositoryToken(FacultyDepartmentEntity),
  );

  try {
    // Tạo exemption percentage mặc định
    let exemptionPercentage = await exemptionRepository.findOne({
      where: { percentage: 0, reason: 'Không có miễn giảm' },
    });

    if (!exemptionPercentage) {
      exemptionPercentage = exemptionRepository.create({
        percentage: 0,
        reason: 'Không có miễn giảm',
      });
      await exemptionRepository.save(exemptionPercentage);
      console.log('Đã tạo exemption percentage mặc định');
    }

    // Tạo academic credential mặc định
    let academicCredential = await academicRepository.findOne({
      where: {
        name: 'Không có học hàm/học vị',
        description: 'Mặc định cho admin',
      },
    });

    if (!academicCredential) {
      academicCredential = academicRepository.create({
        name: 'Không có học hàm/học vị',
        description: 'Mặc định cho admin',
      });
      await academicRepository.save(academicCredential);
      console.log('Đã tạo academic credential mặc định');
    }

    // Tạo faculty department mặc định
    let facultyDepartment = await facultyRepository.findOne({
      where: {
        code: 'ADMIN',
        name: 'Administration',
        description: 'Phòng quản trị hệ thống',
        isFaculty: false,
      },
    });

    if (!facultyDepartment) {
      facultyDepartment = facultyRepository.create({
        code: 'ADMIN',
        name: 'Administration',
        description: 'Phòng quản trị hệ thống',
        isFaculty: false,
      });
      await facultyRepository.save(facultyDepartment);
      console.log('Đã tạo faculty department mặc định');
    }

    // Tạo role admin nếu chưa có
    let adminRole = await roleRepository.findOne({
      where: { name: SystemRole.ADMIN },
    });

    if (!adminRole) {
      adminRole = roleRepository.create({
        name: SystemRole.ADMIN,
        description: 'Administrator',
      });
      await roleRepository.save(adminRole);
      console.log('Đã tạo role admin');
    }

    // Kiểm tra user admin đã tồn tại chưa
    const existingAdmin = await userRepository.findOne({
      where: { username: SystemRole.ADMIN },
    });

    if (existingAdmin) {
      console.log('User admin đã tồn tại');
      return;
    }

    // Tạo user admin
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = userRepository.create({
      username: SystemRole.ADMIN,
      password: hashedPassword,
      fullName: 'Administrator',
      code: 'ADMIN001',
      gender: Gender.OTHER,
      areTeaching: true,
      salaryCoefficient: 0,
      salary: 0,
      position: 'Administrator',
      citizenId: '000000000000',
      exemptionPercentageId: exemptionPercentage.id,
      academicCredentialId: academicCredential.id,
      facultyDepartmentId: facultyDepartment.id,
      roles: [adminRole],
    });

    await userRepository.save(adminUser);
    console.log('Đã tạo user admin thành công');
    console.log('Username: admin');
    console.log('Password: Admin@123');
  } catch (error) {
    console.error('Lỗi khi tạo user admin:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
