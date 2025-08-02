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
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { IsNull, Like, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateFacultyDepartmentDto,
  QueryFacultyDepartmentDeletedDto,
  QueryFacultyDepartmentDto,
  UpdateFacultyDepartmentDto,
} from './faculty-department.dto';

@Injectable()
export class FacultyDepartmentService {
  private readonly logger = new Logger(FacultyDepartmentService.name);

  constructor(
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
  ) {}

  async create(createFacultyDepartmentDto: CreateFacultyDepartmentDto) {
    try {
      const facultyDepartment = this.facultyDepartmentRepository.create(
        createFacultyDepartmentDto,
      );

      const newFacultyDepartment =
        await this.facultyDepartmentRepository.save(facultyDepartment);

      return newFacultyDepartment;
    } catch (error) {
      this.logger.error('Lỗi tạo khoa/phòng ban', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã khoa/phòng ban đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo khoa/phòng ban',
      });
    }
  }

  async findAll(queryDto: QueryFacultyDepartmentDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isFaculty,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereConditions: any = {};

      if (search) {
        whereConditions.name = Like(`%${search}%`);
      }

      if (isFaculty !== undefined) {
        whereConditions.isFaculty = isFaculty;
      }

      const [data, total] = await this.facultyDepartmentRepository.findAndCount(
        {
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
          skip,
          take: limit,
          order: {
            createdAt: 'DESC',
          },
          withDeleted: includeDeleted,
        },
      );

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
      this.logger.error('Lỗi lấy danh sách khoa/phòng ban', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách khoa/phòng ban',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const facultyDepartment = await this.facultyDepartmentRepository.findOne({
        where: { id },
        withDeleted: includeDeleted,
      });

      if (!facultyDepartment) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy khoa/phòng ban',
        });
      }

      return facultyDepartment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin khoa/phòng ban', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin khoa/phòng ban',
      });
    }
  }

  async update(
    id: string,
    updateFacultyDepartmentDto: UpdateFacultyDepartmentDto,
  ) {
    try {
      const facultyDepartment = await this.findOne(id);

      // Kiểm tra nếu đang cập nhật từ khoa thành phòng ban
      if (
        updateFacultyDepartmentDto.isFaculty === false &&
        facultyDepartment.isFaculty === true
      ) {
        // Kiểm tra xem có bộ môn nào đang thuộc khoa này không
        await this.checkSubjectRelationshipForUpdate(id);
      }

      Object.assign(facultyDepartment, updateFacultyDepartmentDto);

      const updatedFacultyDepartment =
        await this.facultyDepartmentRepository.save(facultyDepartment);

      return updatedFacultyDepartment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật khoa/phòng ban', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã khoa/phòng ban đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật khoa/phòng ban',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const facultyDepartment = await this.findOne(id);

      await this.checkSubjectRelationship(id);

      await this.facultyDepartmentRepository.softRemove(facultyDepartment);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm khoa/phòng ban', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm khoa/phòng ban',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const facultyDepartment = await this.findOne(id, true);

      await this.checkSubjectRelationship(id);

      await this.facultyDepartmentRepository.remove(facultyDepartment);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn khoa/phòng ban', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn khoa/phòng ban',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục khoa/phòng ban ${id}`);
    try {
      const facultyDepartment = await this.findOne(id, true);

      await this.facultyDepartmentRepository.restore(id);

      return facultyDepartment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục khoa/phòng ban', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục khoa/phòng ban',
      });
    }
  }

  private async checkSubjectRelationship(facultyDepartmentId: string) {
    const subjectsUsingDepartment = await this.subjectRepository.count({
      where: { facultyDepartmentId },
    });

    if (subjectsUsingDepartment > 0) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: `Không thể xóa khoa/phòng ban này vì đang có ${subjectsUsingDepartment} bộ môn thuộc về khoa/phòng ban này`,
      });
    }
  }

  private async checkSubjectRelationshipForUpdate(facultyDepartmentId: string) {
    const subjectsUsingDepartment = await this.subjectRepository.count({
      where: { facultyDepartmentId },
    });

    if (subjectsUsingDepartment > 0) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: `Không thể cập nhật khoa thành phòng ban vì đang có ${subjectsUsingDepartment} bộ môn thuộc về khoa này`,
      });
    }
  }

  async getDeletedRecords(queryDto: QueryFacultyDepartmentDeletedDto) {
    try {
      const { page = 1, limit = 10, search, isFaculty } = queryDto;
      const skip = (page - 1) * limit;

      const whereConditions: any = {
        deletedAt: Not(IsNull()),
      };

      if (isFaculty !== undefined) {
        whereConditions.isFaculty = isFaculty;
      }

      const [data, total] = await this.facultyDepartmentRepository.findAndCount(
        {
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
          skip,
          take: limit,
          order: {
            deletedAt: 'DESC',
          },
          withDeleted: true,
        },
      );

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
      this.logger.error('Lỗi lấy danh sách khoa/phòng ban đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách khoa/phòng ban đã xóa',
      });
    }
  }

  // async mergeFaculties(mergeFacultiesDto: MergeFacultiesDto) {
  //   this.logger.debug('Bắt đầu gộp khoa/phòng ban', mergeFacultiesDto);

  //   try {
  //     const {
  //       newFaculty,
  //       sourceFacultyIds,
  //       deleteSourceFaculties = true,
  //     } = mergeFacultiesDto;

  //     if (!newFaculty.isFaculty) {
  //       throw new BadRequestException({
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         message: 'Chỉ có thể tạo khoa mới khi gộp, không thể tạo phòng ban',
  //       });
  //     }

  //     const sourceFaculties =
  //       await this.validateSourceFacultiesForMerge(sourceFacultyIds);

  //     return await this.facultyDepartmentRepository.manager.transaction(
  //       async (manager) => {
  //         const facultyRepo = manager.getRepository(FacultyDepartmentEntity);

  //         const createdFaculty = facultyRepo.create(newFaculty);
  //         const savedNewFaculty = await facultyRepo.save(createdFaculty);

  //         if (deleteSourceFaculties) {
  //           await facultyRepo.softRemove(sourceFaculties);
  //         }

  //         return {
  //           newFaculty: savedNewFaculty,
  //           mergedFaculties: sourceFaculties.map((f) => ({
  //             id: f.id,
  //             name: f.name,
  //             code: f.code,
  //           })),
  //           message: `Đã tạo thành công khoa mới "${savedNewFaculty.name}" từ việc gộp ${sourceFaculties.length} khoa`,
  //         };
  //       },
  //     );
  //   } catch (error) {
  //     if (
  //       error instanceof NotFoundException ||
  //       error instanceof BadRequestException ||
  //       error instanceof ForbiddenException
  //     ) {
  //       throw error;
  //     }
  //     this.logger.error('Lỗi gộp khoa', error);
  //     if (error instanceof QueryFailedError) {
  //       throw new ConflictException({
  //         statusCode: HttpStatus.CONFLICT,
  //         message: 'Mã khoa mới đã tồn tại',
  //       });
  //     }
  //     throw new BadRequestException({
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message: 'Không thể gộp khoa',
  //     });
  //   }
  // }

  // private async validateSourceFacultiesForMerge(facultyIds: string[]) {
  //   if (facultyIds.length === 0) {
  //     throw new BadRequestException({
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message: 'Phải có ít nhất một khoa nguồn để gộp',
  //     });
  //   }

  //   const faculties = await this.facultyDepartmentRepository.find({
  //     where: { id: In(facultyIds) },
  //   });

  //   if (faculties.length !== facultyIds.length) {
  //     const foundIds = faculties.map((f) => f.id);
  //     const missingIds = facultyIds.filter((id) => !foundIds.includes(id));
  //     throw new NotFoundException({
  //       statusCode: HttpStatus.NOT_FOUND,
  //       message: `Không tìm thấy khoa với ID: ${missingIds.join(', ')}`,
  //     });
  //   }

  //   const nonFaculties = faculties.filter((f) => !f.isFaculty);
  //   if (nonFaculties.length > 0) {
  //     throw new BadRequestException({
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message: `Chỉ có thể gộp khoa, không thể gộp phòng ban. Khoa không hợp lệ: ${nonFaculties.map((f) => f.name).join(', ')}`,
  //     });
  //   }

  //   return faculties;
  // }
}
