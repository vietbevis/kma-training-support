import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EducationalSystemEntity } from 'src/database/entities/educational-system.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateEducationalSystemDto,
  QueryEducationalSystemDeletedDto,
  QueryEducationalSystemDto,
  QueryEducationalSystemOptionsDto,
  UpdateEducationalSystemDto,
} from './educational-system.dto';

@Injectable()
export class EducationalSystemService {
  private readonly logger = new Logger(EducationalSystemService.name);

  constructor(
    @InjectRepository(EducationalSystemEntity)
    private readonly educationalSystemRepository: Repository<EducationalSystemEntity>,
  ) {}

  async create(createEducationalSystemDto: CreateEducationalSystemDto) {
    try {
      const educationalSystem = this.educationalSystemRepository.create(
        createEducationalSystemDto,
      );

      const newEducationalSystem =
        await this.educationalSystemRepository.save(educationalSystem);

      return newEducationalSystem;
    } catch (error) {
      this.logger.error('Lỗi tạo hệ đào tạo', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Hệ đào tạo đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo hệ đào tạo',
      });
    }
  }

  async findAll(queryDto: QueryEducationalSystemDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        educationLevels,
        tuitions,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        educationLevels: educationLevels || undefined,
        tuitions: tuitions || undefined,
      };

      if (search) {
        whereCondition.code = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] = await this.educationalSystemRepository.findAndCount(
        {
          where: whereCondition,
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
      this.logger.error('Lỗi lấy danh sách hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách hệ đào tạo',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const educationalSystem = await this.educationalSystemRepository.findOne({
        where: {
          id,
        },
        withDeleted: includeDeleted,
      });

      if (!educationalSystem) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy hệ đào tạo',
        });
      }

      return educationalSystem;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin hệ đào tạo',
      });
    }
  }

  async update(
    id: string,
    updateEducationalSystemDto: UpdateEducationalSystemDto,
  ) {
    try {
      const educationalSystem = await this.findOne(id);

      Object.assign(educationalSystem, updateEducationalSystemDto);

      const updatedEducationalSystem =
        await this.educationalSystemRepository.save(educationalSystem);

      return updatedEducationalSystem;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật hệ đào tạo', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Mã hệ đào tạo đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật hệ đào tạo',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const educationalSystem = await this.findOne(id);

      await this.educationalSystemRepository.softRemove(educationalSystem);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm hệ đào tạo',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const educationalSystem = await this.findOne(id, true);

      await this.educationalSystemRepository.remove(educationalSystem);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn hệ đào tạo',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục hệ đào tạo ${id}`);
    try {
      const educationalSystem = await this.findOne(id, true);

      await this.educationalSystemRepository.restore(id);

      return educationalSystem;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục hệ đào tạo',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryEducationalSystemDeletedDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        educationLevels,
        tuitions,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        educationLevels: educationLevels || undefined,
        tuitions: tuitions || undefined,
        deletedAt: Not(IsNull()),
      };

      if (search) {
        whereCondition.code = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] = await this.educationalSystemRepository.findAndCount(
        {
          where: whereCondition,
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
      this.logger.error('Lỗi lấy danh sách hệ đào tạo đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách hệ đào tạo đã xóa',
      });
    }
  }

  async getOptions(queryDto: QueryEducationalSystemOptionsDto) {
    try {
      const { page = 1, limit = 10, search } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {};

      if (search) {
        whereCondition.code = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      // Build query for distinct combinations
      const queryBuilder = this.educationalSystemRepository
        .createQueryBuilder('educationalSystem')
        .select([
          'DISTINCT educationalSystem.educationLevels as educationLevels',
          'educationalSystem.tuitions as tuitions',
        ])
        .orderBy('educationalSystem.educationLevels', 'ASC')
        .addOrderBy('educationalSystem.tuitions', 'ASC');

      // Add where condition if search is provided
      if (Object.keys(whereCondition).length > 0) {
        queryBuilder.where(whereCondition);
      }

      // Get total count for pagination
      const countQuery = this.educationalSystemRepository
        .createQueryBuilder('educationalSystem')
        .select(
          'COUNT(DISTINCT CONCAT(educationalSystem.educationLevels, educationalSystem.tuitions))',
          'count',
        );

      if (Object.keys(whereCondition).length > 0) {
        countQuery.where(whereCondition);
      }

      const totalResult = await countQuery.getRawOne();
      const total = parseInt(totalResult.count);

      // Add pagination
      queryBuilder.skip(skip).take(limit);

      const data = await queryBuilder.getRawMany();

      return {
        data: data.map((item) => ({
          educationLevels: item.educationlevels,
          tuitions: item.tuitions,
        })),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Lỗi lấy danh sách options hệ đào tạo', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách options hệ đào tạo',
      });
    }
  }
}
