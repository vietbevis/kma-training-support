import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateAcademicCredentialDto,
  QueryAcademicCredentialDeletedDto,
  QueryAcademicCredentialDto,
  UpdateAcademicCredentialDto,
} from './academic-credential.dto';

@Injectable()
export class AcademicCredentialService {
  private readonly logger = new Logger(AcademicCredentialService.name);

  constructor(
    @InjectRepository(AcademicCredentialsEntity)
    private readonly academicCredentialRepository: Repository<AcademicCredentialsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createAcademicCredentialDto: CreateAcademicCredentialDto) {
    try {
      const academicCredential = this.academicCredentialRepository.create(
        createAcademicCredentialDto,
      );

      const newAcademicCredential =
        await this.academicCredentialRepository.save(academicCredential);

      return newAcademicCredential;
    } catch (error) {
      this.logger.error('Lỗi tạo học hàm/học vị', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Học hàm/học vị đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo học hàm/học vị',
      });
    }
  }

  async findAll(queryDto: QueryAcademicCredentialDto) {
    try {
      const { page = 1, limit = 10, search, includeDeleted = false } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] =
        await this.academicCredentialRepository.findAndCount({
          where: {
            name: search ? ILike(`%${search}%`) : undefined,
          },
          skip,
          take: limit,
          order: {
            createdAt: 'DESC',
          },
          withDeleted: includeDeleted,
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
      this.logger.error('Lỗi lấy danh sách học hàm/học vị', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách học hàm/học vị',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const academicCredential =
        await this.academicCredentialRepository.findOne({
          where: {
            id,
          },
          withDeleted: includeDeleted,
        });

      if (!academicCredential) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy học hàm/học vị',
        });
      }

      return academicCredential;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin học hàm/học vị', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin học hàm/học vị',
      });
    }
  }

  async update(
    id: string,
    updateAcademicCredentialDto: UpdateAcademicCredentialDto,
  ) {
    try {
      const academicCredential = await this.findOne(id);

      Object.assign(academicCredential, updateAcademicCredentialDto);

      const updatedAcademicCredential =
        await this.academicCredentialRepository.save(academicCredential);

      return updatedAcademicCredential;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật học hàm/học vị', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tên học hàm/học vị đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật học hàm/học vị',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const academicCredential = await this.findOne(id);

      await this.checkUserRelationship(id);

      await this.academicCredentialRepository.softRemove(academicCredential);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm học hàm/học vị', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm học hàm/học vị',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const academicCredential = await this.findOne(id, true);

      await this.checkUserRelationship(id);

      await this.academicCredentialRepository.remove(academicCredential);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn học hàm/học vị', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn học hàm/học vị',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục học hàm/học vị ${id}`);
    try {
      const academicCredential = await this.findOne(id, true);

      await this.academicCredentialRepository.restore(id);

      return academicCredential;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục học hàm/học vị', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục học hàm/học vị',
      });
    }
  }

  private async checkUserRelationship(academicCredentialId: string) {
    try {
      const usersUsingCredential = await this.userRepository.count({
        where: { academicCredentialId },
      });

      if (usersUsingCredential > 0) {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          message: `Không thể xóa học hàm/học vị này vì đang có ${usersUsingCredential} người có học hàm/học vị này`,
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Lỗi kiểm tra quan hệ với người dùng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể kiểm tra quan hệ với người dùng',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryAcademicCredentialDeletedDto) {
    try {
      const { page = 1, limit = 10, search } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] =
        await this.academicCredentialRepository.findAndCount({
          where: {
            name: search ? ILike(`%${search}%`) : undefined,
            deletedAt: Not(IsNull()),
          },
          skip,
          take: limit,
          order: {
            deletedAt: 'DESC',
          },
          withDeleted: true,
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
      this.logger.error('Lỗi lấy danh sách học hàm/học vị đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách học hàm/học vị đã xóa',
      });
    }
  }
}
