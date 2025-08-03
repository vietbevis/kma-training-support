import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { HashingService } from 'src/shared/services/hashing.service';
import { In, Like, QueryFailedError, Repository } from 'typeorm';
import { QueryAccountDto, UpdateAccountDto } from './account.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly hashingService: HashingService,
  ) {}

  async findAll(queryDto: QueryAccountDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      // Chỉ select các thông tin cơ bản liên quan đến tài khoản
      const [data, total] = await this.userRepository.findAndCount({
        select: {
          id: true,
          fullName: true,
          username: true,
          code: true,
          createdAt: true,
          facultyDepartment: {
            id: true,
            name: true,
            code: true,
            isFaculty: true,
          },
          roles: {
            id: true,
            name: true,
            description: true,
          },
        },
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
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
      this.logger.error('Lỗi lấy danh sách tài khoản', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách tài khoản',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      // Chỉ select các thông tin cơ bản liên quan đến tài khoản
      const user = await this.userRepository.findOne({
        select: {
          id: true,
          fullName: true,
          username: true,
          code: true,
          createdAt: true,
          facultyDepartment: {
            id: true,
            name: true,
            code: true,
            isFaculty: true,
          },
          roles: {
            id: true,
            name: true,
            description: true,
          },
        },
        where: {
          id,
        },
        withDeleted: includeDeleted,
        relations: {
          facultyDepartment: true,
          roles: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tài khoản',
        });
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin tài khoản', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin tài khoản',
      });
    }
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: {
          facultyDepartment: true,
          roles: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tài khoản',
        });
      }

      // Kiểm tra roleIds có tồn tại không (nếu có cập nhật)
      const roleIdsSet = new Set(updateAccountDto.roleIds);
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

      // Chỉ cập nhật các thông tin được phép
      if (updateAccountDto.fullName !== undefined) {
        user.fullName = updateAccountDto.fullName;
      }

      // Xử lý password nếu có cập nhật
      if (updateAccountDto.password) {
        const isPasswordChanged = this.hashingService.compare(
          updateAccountDto.password,
          user.password,
        );
        if (!isPasswordChanged) {
          user.password = this.hashingService.hash(updateAccountDto.password);
        }
      }

      const updatedUser = await this.userRepository.save(user);

      const result = await this.findOne(updatedUser.id);

      return result;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật tài khoản', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tài khoản đã tồn tại (username hoặc code đã được sử dụng)',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật tài khoản',
      });
    }
  }
}
