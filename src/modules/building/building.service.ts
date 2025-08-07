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
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateBuildingDto,
  QueryBuildingDeletedDto,
  QueryBuildingDto,
  UpdateBuildingDto,
} from './building.dto';

@Injectable()
export class BuildingService {
  private readonly logger = new Logger(BuildingService.name);

  constructor(
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    @InjectRepository(ClassroomEntity)
    private readonly classroomRepository: Repository<ClassroomEntity>,
  ) {}

  async create(createBuildingDto: CreateBuildingDto) {
    try {
      const building = this.buildingRepository.create(createBuildingDto);

      const newBuilding = await this.buildingRepository.save(building);

      return newBuilding;
    } catch (error) {
      this.logger.error('Lỗi tạo tòa nhà', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tòa nhà đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo tòa nhà',
      });
    }
  }

  async findAll(queryDto: QueryBuildingDto) {
    try {
      const { page = 1, limit = 10, search, includeDeleted = false } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.buildingRepository.findAndCount({
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
      this.logger.error('Lỗi lấy danh sách tòa nhà', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách tòa nhà',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const building = await this.buildingRepository.findOne({
        where: {
          id,
        },
        withDeleted: includeDeleted,
      });

      if (!building) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tòa nhà',
        });
      }

      return building;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin tòa nhà', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin tòa nhà',
      });
    }
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto) {
    try {
      const building = await this.findOne(id);

      Object.assign(building, updateBuildingDto);

      const updatedBuilding = await this.buildingRepository.save(building);

      return updatedBuilding;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật tòa nhà', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tên tòa nhà đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật tòa nhà',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const building = await this.findOne(id);

      await this.checkClassroomRelationship(id);

      await this.buildingRepository.softRemove(building);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm tòa nhà', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm tòa nhà',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const building = await this.findOne(id, true);

      await this.checkClassroomRelationship(id);

      await this.buildingRepository.remove(building);

      return { id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn tòa nhà', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn tòa nhà',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục tòa nhà ${id}`);
    try {
      const building = await this.findOne(id, true);

      await this.buildingRepository.restore(id);

      return building;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục tòa nhà', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục tòa nhà',
      });
    }
  }

  private async checkClassroomRelationship(buildingId: string) {
    try {
      const classroomsInBuilding = await this.classroomRepository.count({
        where: { buildingId },
      });

      if (classroomsInBuilding > 0) {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          message: `Không thể xóa tòa nhà này vì đang có ${classroomsInBuilding} phòng học trong tòa nhà này`,
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Lỗi kiểm tra quan hệ với phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể kiểm tra quan hệ với phòng học',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryBuildingDeletedDto) {
    try {
      const { page = 1, limit = 10, search } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.buildingRepository.findAndCount({
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
      this.logger.error('Lỗi lấy danh sách tòa nhà đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách tòa nhà đã xóa',
      });
    }
  }
}
