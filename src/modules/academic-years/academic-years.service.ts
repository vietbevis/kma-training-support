import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateAcademicYearDto,
  QueryAcademicYearDeletedDto,
  QueryAcademicYearDto,
  UpdateAcademicYearDto,
} from './academic-years.dto';

@Injectable()
export class AcademicYearsService {
  private readonly logger = new Logger(AcademicYearsService.name);

  constructor(
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepository: Repository<AcademicYearEntity>,
  ) {}

  async create(createAcademicYearDto: CreateAcademicYearDto) {
    try {
      const academicYear = this.academicYearRepository.create(
        createAcademicYearDto,
      );

      const newAcademicYear =
        await this.academicYearRepository.save(academicYear);

      return newAcademicYear;
    } catch (error) {
      this.logger.error('Lỗi tạo năm học', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Năm học đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo năm học',
      });
    }
  }

  async findAll(queryDto: QueryAcademicYearDto) {
    try {
      const { page = 1, limit = 10, search, includeDeleted = false } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.academicYearRepository.findAndCount({
        where: {
          yearCode: search ? ILike(`%${search}%`) : undefined,
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
      this.logger.error('Lỗi lấy danh sách năm học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách năm học',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const academicYear = await this.academicYearRepository.findOne({
        where: {
          id,
        },
        withDeleted: includeDeleted,
      });

      if (!academicYear) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy năm học',
        });
      }

      return academicYear;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin năm học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin năm học',
      });
    }
  }

  async update(id: string, updateAcademicYearDto: UpdateAcademicYearDto) {
    try {
      const academicYear = await this.findOne(id);

      Object.assign(academicYear, updateAcademicYearDto);

      const updatedAcademicYear =
        await this.academicYearRepository.save(academicYear);

      return updatedAcademicYear;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật năm học', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã năm học đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật năm học',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const academicYear = await this.findOne(id);

      await this.academicYearRepository.softRemove(academicYear);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm năm học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm năm học',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const academicYear = await this.findOne(id, true);

      await this.academicYearRepository.remove(academicYear);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn năm học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn năm học',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục năm học ${id}`);
    try {
      const academicYear = await this.findOne(id, true);

      await this.academicYearRepository.restore(id);

      return academicYear;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục năm học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục năm học',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryAcademicYearDeletedDto) {
    try {
      const { page = 1, limit = 10, search } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.academicYearRepository.findAndCount({
        where: {
          yearCode: search ? ILike(`%${search}%`) : undefined,
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
      this.logger.error('Lỗi lấy danh sách năm học đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách năm học đã xóa',
      });
    }
  }
}
