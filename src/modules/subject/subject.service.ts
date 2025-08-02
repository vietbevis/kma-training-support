import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { IsNull, Like, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateSubjectDto,
  QuerySubjectDeletedDto,
  QuerySubjectDto,
  UpdateSubjectDto,
} from './subject.dto';

@Injectable()
export class SubjectService {
  private readonly logger = new Logger(SubjectService.name);

  constructor(
    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto) {
    try {
      await this.validateFaculty(createSubjectDto.facultyDepartmentId);

      if (createSubjectDto.headOfDepartmentId) {
        await this.validateUser(createSubjectDto.headOfDepartmentId);
      }

      const subject = this.subjectRepository.create(createSubjectDto);

      const newSubject = await this.subjectRepository.save(subject);

      return newSubject;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi tạo bộ môn', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã bộ môn đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo bộ môn',
      });
    }
  }

  async findAll(queryDto: QuerySubjectDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereConditions: any = {};

      if (facultyDepartmentId) {
        whereConditions.facultyDepartmentId = facultyDepartmentId;
      }

      const [data, total] = await this.subjectRepository.findAndCount({
        where: [
          { ...whereConditions, name: Like(`%${search || ''}%`) },
          { ...whereConditions, code: Like(`%${search || ''}%`) },
        ].filter((condition) => {
          if (!search) {
            const { name, code, ...rest } = condition;
            return Object.keys(rest).length > 0 ? rest : {};
          }
          return condition;
        }),
        relations: {
          facultyDepartment: true,
          headOfDepartment: true,
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
      this.logger.error('Lỗi lấy danh sách bộ môn', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách bộ môn',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const subject = await this.subjectRepository.findOne({
        where: { id },
        relations: {
          facultyDepartment: true,
          headOfDepartment: true,
        },
        withDeleted: includeDeleted,
      });

      if (!subject) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy bộ môn',
        });
      }

      return subject;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin bộ môn', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin bộ môn',
      });
    }
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    try {
      const subject = await this.findOne(id);

      if (updateSubjectDto.facultyDepartmentId) {
        await this.validateFaculty(updateSubjectDto.facultyDepartmentId);
      }

      if (updateSubjectDto.headOfDepartmentId) {
        await this.validateUser(updateSubjectDto.headOfDepartmentId);
      }

      Object.assign(subject, updateSubjectDto);

      const updatedSubject = await this.subjectRepository.save(subject);

      return updatedSubject;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật bộ môn', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã bộ môn đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật bộ môn',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const subject = await this.findOne(id);

      await this.subjectRepository.softRemove(subject);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm bộ môn', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm bộ môn',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const subject = await this.findOne(id, true);

      await this.subjectRepository.remove(subject);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn bộ môn', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn bộ môn',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục bộ môn ${id}`);
    try {
      const subject = await this.findOne(id, true);

      await this.subjectRepository.restore(id);

      return subject;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục bộ môn', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục bộ môn',
      });
    }
  }

  async getDeletedRecords(queryDto: QuerySubjectDeletedDto) {
    try {
      const { page = 1, limit = 10, search, facultyDepartmentId } = queryDto;
      const skip = (page - 1) * limit;

      const whereConditions: any = {
        deletedAt: Not(IsNull()),
      };

      if (facultyDepartmentId) {
        whereConditions.facultyDepartmentId = facultyDepartmentId;
      }

      const [data, total] = await this.subjectRepository.findAndCount({
        where: [
          { ...whereConditions, name: Like(`%${search || ''}%`) },
          { ...whereConditions, code: Like(`%${search || ''}%`) },
        ].filter((condition) => {
          if (!search) {
            const { name, code, ...rest } = condition;
            return Object.keys(rest).length > 0 ? rest : {};
          }
          return condition;
        }),
        relations: {
          facultyDepartment: true,
          headOfDepartment: true,
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
      this.logger.error('Lỗi lấy danh sách bộ môn đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách bộ môn đã xóa',
      });
    }
  }

  private async validateFaculty(facultyDepartmentId: string) {
    const faculty = await this.facultyDepartmentRepository.findOne({
      where: { id: facultyDepartmentId, isFaculty: true },
    });

    if (!faculty) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Không tìm thấy khoa',
      });
    }

    return faculty;
  }

  private async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Không tìm thấy người dùng',
      });
    }

    return user;
  }
}
