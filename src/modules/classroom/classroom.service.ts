import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  BuildingClassroomAvailabilityResponseDto,
  ClassroomAvailabilityResponseDto,
  CreateClassroomDto,
  QueryClassroomAvailabilityDto,
  QueryClassroomDeletedDto,
  QueryClassroomDto,
  UpdateClassroomDto,
} from './classroom.dto';

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(
    @InjectRepository(ClassroomEntity)
    private readonly classroomRepository: Repository<ClassroomEntity>,
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    @InjectRepository(TimeSlotEntity)
    private readonly timeSlotRepository: Repository<TimeSlotEntity>,
  ) {}

  async create(createClassroomDto: CreateClassroomDto) {
    try {
      // Kiểm tra tòa nhà tồn tại
      const building = await this.buildingRepository.findOne({
        where: { id: createClassroomDto.buildingId },
      });

      if (!building) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tòa nhà',
        });
      }

      const classroom = this.classroomRepository.create(createClassroomDto);

      const newClassroom = await this.classroomRepository.save(classroom);

      return newClassroom;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi tạo phòng học', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Phòng học đã tồn tại trong tòa nhà này',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo phòng học',
      });
    }
  }

  async findAll(queryDto: QueryClassroomDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        buildingId,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        name: search ? ILike(`%${search}%`) : undefined,
        buildingId: buildingId || undefined,
      };

      // Loại bỏ các điều kiện undefined
      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] = await this.classroomRepository.findAndCount({
        where: whereCondition,
        relations: ['building'],
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
      this.logger.error('Lỗi lấy danh sách phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách phòng học',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const classroom = await this.classroomRepository.findOne({
        where: {
          id,
        },
        relations: ['building'],
        withDeleted: includeDeleted,
      });

      if (!classroom) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy phòng học',
        });
      }

      return classroom;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin phòng học',
      });
    }
  }

  async update(id: string, updateClassroomDto: UpdateClassroomDto) {
    try {
      const classroom = await this.classroomRepository.findOne({
        where: { id },
        select: { id: true, name: true, buildingId: true },
      });

      if (!classroom) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy phòng học',
        });
      }

      if (
        updateClassroomDto.buildingId &&
        updateClassroomDto.buildingId !== classroom.buildingId
      ) {
        const building = await this.buildingRepository.findOne({
          where: { id: updateClassroomDto.buildingId },
        });

        if (!building) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy tòa nhà',
          });
        }
      }

      Object.assign(classroom, updateClassroomDto);

      const updatedClassroom = await this.classroomRepository.save(classroom);

      return updatedClassroom;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật phòng học', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tên phòng học đã tồn tại trong tòa nhà này',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật phòng học',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const classroom = await this.findOne(id);

      await this.classroomRepository.softRemove(classroom);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm phòng học',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const classroom = await this.findOne(id, true);

      await this.classroomRepository.remove(classroom);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn phòng học',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục phòng học ${id}`);
    try {
      const classroom = await this.findOne(id, true);

      await this.classroomRepository.restore(id);

      return classroom;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục phòng học',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryClassroomDeletedDto) {
    try {
      const { page = 1, limit = 10, search, buildingId } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        name: search ? ILike(`%${search}%`) : undefined,
        buildingId: buildingId || undefined,
        deletedAt: Not(IsNull()),
      };

      // Loại bỏ các điều kiện undefined
      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] = await this.classroomRepository.findAndCount({
        where: whereCondition,
        relations: ['building'],
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
      this.logger.error('Lỗi lấy danh sách phòng học đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách phòng học đã xóa',
      });
    }
  }

  async getClassroomAvailability(
    queryDto: QueryClassroomAvailabilityDto,
  ): Promise<BuildingClassroomAvailabilityResponseDto> {
    try {
      const { buildingId, date, timeSlot } = queryDto;

      // Kiểm tra tòa nhà tồn tại
      const building = await this.buildingRepository.findOne({
        where: { id: buildingId },
      });

      if (!building) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tòa nhà',
        });
      }

      // Lấy tất cả phòng học của tòa nhà
      const classrooms = await this.classroomRepository.find({
        where: { buildingId },
        order: { name: 'ASC' },
      });

      // Chuyển đổi ngày thành thứ trong tuần (1-7)
      const queryDate = new Date(date);
      const dayOfWeek = queryDate.getDay(); // Chủ nhật = 0, thứ 2 = 1

      // Tìm các timeslot đang được sử dụng trong ngày và ca đó
      const timeSlotQuery = this.timeSlotRepository
        .createQueryBuilder('timeslot')
        .leftJoinAndSelect('timeslot.classroom', 'classroom')
        .where('classroom.buildingId = :buildingId', { buildingId })
        .andWhere('timeslot.startDate <= :date AND timeslot.endDate >= :date', {
          date,
        })
        .andWhere('timeslot.dayOfWeek = :dayOfWeek', {
          dayOfWeek: dayOfWeek + 1,
        });

      // Bắt buộc lọc theo ca học cụ thể
      timeSlotQuery.andWhere('timeslot.timeSlot = :timeSlot', { timeSlot });

      const occupiedTimeSlots = await timeSlotQuery.getMany();

      // Map thông tin phòng đang được sử dụng
      const occupiedClassroomMap = new Map<string, any>();
      occupiedTimeSlots.forEach((slot) => {
        if (!occupiedClassroomMap.has(slot.classroomId)) {
          occupiedClassroomMap.set(slot.classroomId, []);
        }
        occupiedClassroomMap.get(slot.classroomId)!.push({
          timeSlot: slot.timeSlot,
          startDate: slot.startDate,
          endDate: slot.endDate,
          dayOfWeek: slot.dayOfWeek,
          timetableId: slot.timetableId,
        });
      });

      // Tạo response cho từng phòng học
      const classroomAvailability: ClassroomAvailabilityResponseDto[] =
        classrooms.map((classroom) => {
          const occupancyInfo = occupiedClassroomMap.get(classroom.id);
          const isOccupied = occupancyInfo && occupancyInfo.length > 0;

          return {
            id: classroom.id,
            name: classroom.name,
            type: classroom.type,
            description: classroom.description,
            isOccupied: !!isOccupied,
            occupancyDetails: isOccupied ? occupancyInfo[0] : undefined, // Lấy thông tin đầu tiên nếu có nhiều
          };
        });

      // Tính toán thống kê
      const total = classrooms.length;
      const occupied = classroomAvailability.filter(
        (cr) => cr.isOccupied,
      ).length;
      const available = total - occupied;

      return {
        building: {
          id: building.id,
          name: building.name,
          description: building.description,
        },
        date,
        timeSlot,
        classrooms: classroomAvailability,
        summary: {
          total,
          occupied,
          available,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin tình trạng phòng học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin tình trạng phòng học',
      });
    }
  }
}
