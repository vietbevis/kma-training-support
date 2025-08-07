import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateExemptionPercentageDto,
  QueryExemptionPercentageDeletedDto,
  QueryExemptionPercentageDto,
  UpdateExemptionPercentageDto,
} from './exemption-percentage.dto';

@Injectable()
export class ExemptionPercentageService {
  private readonly logger = new Logger(ExemptionPercentageService.name);

  constructor(
    @InjectRepository(ExemptionPercentageEntity)
    private readonly exemptionPercentageRepository: Repository<ExemptionPercentageEntity>,
  ) {}

  async create(createExemptionPercentageDto: CreateExemptionPercentageDto) {
    try {
      const exemptionPercentage = this.exemptionPercentageRepository.create(
        createExemptionPercentageDto,
      );

      const newExemptionPercentage =
        await this.exemptionPercentageRepository.save(exemptionPercentage);

      return newExemptionPercentage;
    } catch (error) {
      this.logger.error('Lỗi tạo phần trăm miễn giảm', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Phần trăm miễn giảm đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo phần trăm miễn giảm',
      });
    }
  }

  async findAll(queryDto: QueryExemptionPercentageDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        percentage,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        percentage: percentage || undefined,
      };

      if (search) {
        whereCondition.reason = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] =
        await this.exemptionPercentageRepository.findAndCount({
          where: whereCondition,
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
      this.logger.error('Lỗi lấy danh sách phần trăm miễn giảm', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách phần trăm miễn giảm',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const exemptionPercentage =
        await this.exemptionPercentageRepository.findOne({
          where: {
            id,
          },
          withDeleted: includeDeleted,
        });

      if (!exemptionPercentage) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy phần trăm miễn giảm',
        });
      }

      return exemptionPercentage;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin phần trăm miễn giảm', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin phần trăm miễn giảm',
      });
    }
  }

  async update(
    id: string,
    updateExemptionPercentageDto: UpdateExemptionPercentageDto,
  ) {
    try {
      const exemptionPercentage = await this.findOne(id);

      Object.assign(exemptionPercentage, updateExemptionPercentageDto);

      const updatedExemptionPercentage =
        await this.exemptionPercentageRepository.save(exemptionPercentage);

      return updatedExemptionPercentage;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật phần trăm miễn giảm', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Phần trăm miễn giảm đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật phần trăm miễn giảm',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const exemptionPercentage = await this.findOne(id);

      await this.exemptionPercentageRepository.softRemove(exemptionPercentage);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm phần trăm miễn giảm', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm phần trăm miễn giảm',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const exemptionPercentage = await this.findOne(id, true);

      await this.exemptionPercentageRepository.remove(exemptionPercentage);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn phần trăm miễn giảm', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn phần trăm miễn giảm',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục phần trăm miễn giảm ${id}`);
    try {
      const exemptionPercentage = await this.findOne(id, true);

      await this.exemptionPercentageRepository.restore(id);

      return exemptionPercentage;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục phần trăm miễn giảm', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục phần trăm miễn giảm',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryExemptionPercentageDeletedDto) {
    try {
      const { page = 1, limit = 10, search, percentage } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        percentage: percentage || undefined,
        deletedAt: Not(IsNull()),
      };

      if (search) {
        whereCondition.reason = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] =
        await this.exemptionPercentageRepository.findAndCount({
          where: whereCondition,
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
      this.logger.error('Lỗi lấy danh sách phần trăm miễn giảm đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách phần trăm miễn giảm đã xóa',
      });
    }
  }
}
