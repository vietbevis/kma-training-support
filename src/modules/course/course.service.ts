import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CourseEntity } from 'src/database/entities/course.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateCourseDto,
  QueryCourseDeletedDto,
  QueryCourseDto,
  UpdateCourseDto,
} from './course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
  ) {}

  async create(createCourseDto: CreateCourseDto) {
    try {
      // Kiểm tra khoa tồn tại nếu có
      if (createCourseDto.facultyDepartmentId) {
        const facultyDepartment =
          await this.facultyDepartmentRepository.findOne({
            where: {
              id: createCourseDto.facultyDepartmentId,
              isFaculty: true,
            },
          });

        if (!facultyDepartment) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy khoa',
          });
        }
      }

      // Kiểm tra bộ môn tồn tại nếu có
      if (createCourseDto.subjectId) {
        const subject = await this.subjectRepository.findOne({
          where: { id: createCourseDto.subjectId },
        });

        if (!subject) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy bộ môn',
          });
        }
      }

      const course = this.courseRepository.create(createCourseDto);

      const newCourse = await this.courseRepository.save(course);

      return newCourse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi tạo học phần', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Học phần đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo học phần',
      });
    }
  }

  async findAll(queryDto: QueryCourseDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        semester,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.courseRepository.findAndCount({
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
          subjectId: subjectId || undefined,
          semester: semester || undefined,
          courseCode: search ? ILike(`%${search}%`) : undefined,
        },
        relations: {
          facultyDepartment: true,
          subject: true,
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
      this.logger.error('Lỗi lấy danh sách học phần', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách học phần',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const course = await this.courseRepository.findOne({
        where: {
          id,
        },
        relations: {
          facultyDepartment: true,
          subject: true,
        },
        withDeleted: includeDeleted,
      });

      if (!course) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy học phần',
        });
      }

      return course;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin học phần', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin học phần',
      });
    }
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    try {
      const course = await this.courseRepository.findOne({
        where: { id },
        select: {
          id: true,
          facultyDepartmentId: true,
          subjectId: true,
        },
      });

      if (!course) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy học phần',
        });
      }

      // Kiểm tra khoa tồn tại nếu có cập nhật
      if (
        updateCourseDto.facultyDepartmentId &&
        updateCourseDto.facultyDepartmentId !== course?.facultyDepartmentId
      ) {
        const facultyDepartment =
          await this.facultyDepartmentRepository.findOne({
            where: {
              id: updateCourseDto.facultyDepartmentId,
              isFaculty: true,
            },
          });

        if (!facultyDepartment) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy khoa',
          });
        }
      }

      // Kiểm tra bộ môn tồn tại nếu có cập nhật
      if (
        updateCourseDto.subjectId &&
        updateCourseDto.subjectId !== course?.subjectId
      ) {
        const subject = await this.subjectRepository.findOne({
          where: { id: updateCourseDto.subjectId },
        });

        if (!subject) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy bộ môn',
          });
        }
      }

      Object.assign(course, updateCourseDto);

      if (!updateCourseDto.subjectId) {
        course.subjectId = null;
      }

      if (!updateCourseDto.facultyDepartmentId) {
        course.facultyDepartmentId = null;
      }

      const updatedCourse = await this.courseRepository.save(course);

      return updatedCourse;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật học phần', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã học phần đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật học phần',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const course = await this.findOne(id);

      await this.courseRepository.softRemove(course);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm học phần', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm học phần',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const course = await this.findOne(id, true);

      await this.courseRepository.remove(course);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn học phần', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn học phần',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục học phần ${id}`);
    try {
      const course = await this.findOne(id, true);

      await this.courseRepository.restore(id);

      return course;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục học phần', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục học phần',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryCourseDeletedDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        semester,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        facultyDepartmentId: facultyDepartmentId || undefined,
        subjectId: subjectId || undefined,
        semester: semester || undefined,
        deletedAt: Not(IsNull()),
      };

      // Thêm điều kiện tìm kiếm nếu có
      if (search) {
        whereCondition.courseCode = ILike(`%${search}%`);
      }

      // Loại bỏ các điều kiện undefined
      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] = await this.courseRepository.findAndCount({
        where: whereCondition,
        relations: {
          facultyDepartment: true,
          subject: true,
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
      this.logger.error('Lỗi lấy danh sách học phần đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách học phần đã xóa',
      });
    }
  }
}
