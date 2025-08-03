import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { HashingService } from 'src/shared/services/hashing.service';
import { In, IsNull, Like, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateUserDto,
  QueryUserDeletedDto,
  QueryUserDto,
  UpdateUserDto,
} from './user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
    @InjectRepository(AcademicCredentialsEntity)
    private readonly academicCredentialRepository: Repository<AcademicCredentialsEntity>,
    @InjectRepository(ExemptionPercentageEntity)
    private readonly exemptionPercentageRepository: Repository<ExemptionPercentageEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly hashingService: HashingService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // Kiểm tra facultyDepartmentId có tồn tại không
      const facultyDepartment = await this.facultyDepartmentRepository.findOne({
        where: { id: createUserDto.facultyDepartmentId },
      });

      if (!facultyDepartment) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy phòng ban/khoa',
        });
      }

      // Kiểm tra academicCredentialId có tồn tại không
      const academicCredential =
        await this.academicCredentialRepository.findOne({
          where: { id: createUserDto.academicCredentialId },
        });

      if (!academicCredential) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy học hàm/học vị',
        });
      }

      // Kiểm tra exemptionPercentageId có tồn tại không (nếu có)
      if (createUserDto.exemptionPercentageId) {
        const exemptionPercentage =
          await this.exemptionPercentageRepository.findOne({
            where: { id: createUserDto.exemptionPercentageId },
          });

        if (!exemptionPercentage) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy phần trăm miễn giảm',
          });
        }
      }

      // Logic đặc biệt: Nếu thuộc khoa (isFaculty = true) thì bắt buộc phải có subjectId
      if (facultyDepartment.isFaculty) {
        if (!createUserDto.subjectId) {
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Nhân viên thuộc khoa phải chọn bộ môn',
          });
        }

        // Kiểm tra subjectId có tồn tại và thuộc về khoa được chọn không
        const subject = await this.subjectRepository.findOne({
          where: {
            id: createUserDto.subjectId,
            facultyDepartmentId: createUserDto.facultyDepartmentId,
          },
        });

        if (!subject) {
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Bộ môn không tồn tại hoặc không thuộc khoa được chọn',
          });
        }
      } else {
        // Nếu thuộc phòng ban (không phải khoa) thì không được có subjectId
        if (createUserDto.subjectId) {
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Nhân viên thuộc phòng ban không được chọn bộ môn',
          });
        }
      }

      const user = this.userRepository.create({
        ...createUserDto,
        password: this.hashingService.hash(createUserDto.password),
      });

      // Xử lý roles nếu có
      const roleIdsSet = new Set(createUserDto.roleIds);
      if (roleIdsSet.size > 0) {
        const roles = await this.roleRepository.find({
          where: {
            id: In(Array.from(roleIdsSet)),
          },
        });
        if (roles.length !== roleIdsSet.size) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Một số vai trò không tồn tại',
          });
        }
        user.roles = roles;
      }

      const newUser = await this.userRepository.save(user);

      return newUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi tạo nhân viên', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Nhân viên đã tồn tại (username hoặc code đã được sử dụng)',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo nhân viên',
      });
    }
  }

  async findAll(queryDto: QueryUserDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        academicCredentialId,
        gender,
        areTeaching,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.userRepository.findAndCount({
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
          subjectId: subjectId || undefined,
          academicCredentialId: academicCredentialId || undefined,
          gender: gender || undefined,
          areTeaching: areTeaching !== undefined ? areTeaching : undefined,
          fullName: search ? Like(`%${search}%`) : undefined,
        },
        skip,
        take: limit,
        order: {
          createdAt: 'DESC',
        },
        withDeleted: includeDeleted,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
          roles: true,
        },
      });

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Lỗi lấy danh sách nhân viên', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách nhân viên',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const user = await this.userRepository.findOne({
        where: {
          id,
        },
        withDeleted: includeDeleted,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
          roles: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy nhân viên',
        });
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin nhân viên', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin nhân viên',
      });
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findOne(id);

      // Kiểm tra facultyDepartmentId có tồn tại không (nếu có cập nhật)
      if (updateUserDto.facultyDepartmentId) {
        const facultyDepartment =
          await this.facultyDepartmentRepository.findOne({
            where: { id: updateUserDto.facultyDepartmentId },
          });

        if (!facultyDepartment) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy phòng ban/khoa',
          });
        }

        // Logic đặc biệt: Nếu thuộc khoa (isFaculty = true) thì bắt buộc phải có subjectId
        if (facultyDepartment.isFaculty) {
          if (!updateUserDto.subjectId) {
            throw new BadRequestException({
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Nhân viên thuộc khoa phải chọn bộ môn',
            });
          }

          // Kiểm tra subjectId có tồn tại và thuộc về khoa được chọn không
          const subject = await this.subjectRepository.findOne({
            where: {
              id: updateUserDto.subjectId,
              facultyDepartmentId: updateUserDto.facultyDepartmentId,
            },
          });

          if (!subject) {
            throw new BadRequestException({
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Bộ môn không tồn tại hoặc không thuộc khoa được chọn',
            });
          }
        } else {
          // Nếu thuộc phòng ban (không phải khoa) thì không được có subjectId
          if (updateUserDto.subjectId) {
            throw new BadRequestException({
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Nhân viên thuộc phòng ban không được chọn bộ môn',
            });
          }
        }
      }

      // Kiểm tra academicCredentialId có tồn tại không (nếu có cập nhật)
      if (updateUserDto.academicCredentialId) {
        const academicCredential =
          await this.academicCredentialRepository.findOne({
            where: { id: updateUserDto.academicCredentialId },
          });

        if (!academicCredential) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy học hàm/học vị',
          });
        }
      }

      // Kiểm tra exemptionPercentageId có tồn tại không (nếu có cập nhật)
      if (updateUserDto.exemptionPercentageId) {
        const exemptionPercentage =
          await this.exemptionPercentageRepository.findOne({
            where: { id: updateUserDto.exemptionPercentageId },
          });

        if (!exemptionPercentage) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy phần trăm miễn giảm',
          });
        }
      }

      // Kiểm tra roleIds có tồn tại không (nếu có cập nhật)
      const roleIdsSet = new Set(updateUserDto.roleIds);
      if (roleIdsSet.size > 0) {
        const roles = await this.roleRepository.find({
          where: {
            id: In(Array.from(roleIdsSet)),
          },
        });
        if (roles.length !== roleIdsSet.size) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Một số vai trò không tồn tại',
          });
        }
        user.roles = roles;
      }

      Object.assign(user, updateUserDto);

      // Kiểm tra password có tồn tại không (nếu có cập nhật)
      // Nếu có thì có thay đổi không
      if (updateUserDto.password) {
        const isPasswordChanged = this.hashingService.compare(
          updateUserDto.password,
          user.password,
        );
        if (!isPasswordChanged) {
          user.password = this.hashingService.hash(updateUserDto.password);
        }
      }

      const updatedUser = await this.userRepository.save(user);

      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật nhân viên', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Nhân viên đã tồn tại (username hoặc code đã được sử dụng)',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật nhân viên',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const user = await this.findOne(id);

      await this.userRepository.softRemove(user);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm nhân viên', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm nhân viên',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const user = await this.findOne(id, true);

      await this.userRepository.remove(user);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn nhân viên', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn nhân viên',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục nhân viên ${id}`);
    try {
      const user = await this.findOne(id, true);

      await this.userRepository.restore(id);

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục nhân viên', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục nhân viên',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryUserDeletedDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        academicCredentialId,
        gender,
        areTeaching,
      } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.userRepository.findAndCount({
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
          subjectId: subjectId || undefined,
          academicCredentialId: academicCredentialId || undefined,
          gender: gender || undefined,
          areTeaching: areTeaching !== undefined ? areTeaching : undefined,
          deletedAt: Not(IsNull()),
          fullName: search ? Like(`%${search}%`) : undefined,
        },
        skip,
        take: limit,
        order: {
          deletedAt: 'DESC',
        },
        withDeleted: true,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
          roles: true,
        },
      });

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Lỗi lấy danh sách nhân viên đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách nhân viên đã xóa',
      });
    }
  }
}
