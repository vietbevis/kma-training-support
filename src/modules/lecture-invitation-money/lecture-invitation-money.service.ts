import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { LectureInvitationMoneyEntity } from 'src/database/entities/lecture-invitation-money.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateLectureInvitationMoneyDto,
  QueryLectureInvitationMoneyDeletedDto,
  QueryLectureInvitationMoneyDto,
  UpdateLectureInvitationMoneyDto,
} from './lecture-invitation-money.dto';

@Injectable()
export class LectureInvitationMoneyService {
  private readonly logger = new Logger(LectureInvitationMoneyService.name);

  constructor(
    @InjectRepository(LectureInvitationMoneyEntity)
    private readonly lectureInvitationMoneyRepository: Repository<LectureInvitationMoneyEntity>,
    @InjectRepository(AcademicCredentialsEntity)
    private readonly academicCredentialRepository: Repository<AcademicCredentialsEntity>,
  ) {}

  async create(
    createLectureInvitationMoneyDto: CreateLectureInvitationMoneyDto,
  ) {
    try {
      // Kiểm tra academicCredentialId có tồn tại không
      const academicCredential =
        await this.academicCredentialRepository.findOne({
          where: { id: createLectureInvitationMoneyDto.academicCredentialId },
        });

      if (!academicCredential) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy học hàm/học vị',
        });
      }

      const lectureInvitationMoney =
        this.lectureInvitationMoneyRepository.create({
          ...createLectureInvitationMoneyDto,
          academicCredential,
        });

      const newLectureInvitationMoney =
        await this.lectureInvitationMoneyRepository.save(
          lectureInvitationMoney,
        );

      return newLectureInvitationMoney;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi tạo tiền mời giảng', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tiền mời giảng đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể tạo tiền mời giảng',
      });
    }
  }

  async findAll(queryDto: QueryLectureInvitationMoneyDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        academicCredentialId,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        academicCredentialId: academicCredentialId || undefined,
      };

      if (search) {
        whereCondition.educationalSystem = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] =
        await this.lectureInvitationMoneyRepository.findAndCount({
          where: whereCondition,
          skip,
          take: limit,
          order: {
            createdAt: 'DESC',
          },
          withDeleted: includeDeleted,
          relations: { academicCredential: true },
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
      this.logger.error('Lỗi lấy danh sách tiền mời giảng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách tiền mời giảng',
      });
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const lectureInvitationMoney =
        await this.lectureInvitationMoneyRepository.findOne({
          where: {
            id,
          },
          withDeleted: includeDeleted,
          relations: { academicCredential: true },
        });

      if (!lectureInvitationMoney) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy tiền mời giảng',
        });
      }

      return lectureInvitationMoney;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin tiền mời giảng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin tiền mời giảng',
      });
    }
  }

  async update(
    id: string,
    updateLectureInvitationMoneyDto: UpdateLectureInvitationMoneyDto,
  ) {
    try {
      const lectureInvitationMoney = await this.findOne(id);

      // Kiểm tra academicCredentialId có tồn tại không nếu có cập nhật
      if (updateLectureInvitationMoneyDto.academicCredentialId) {
        const academicCredential =
          await this.academicCredentialRepository.findOne({
            where: { id: updateLectureInvitationMoneyDto.academicCredentialId },
          });

        if (!academicCredential) {
          throw new NotFoundException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Không tìm thấy học hàm/học vị',
          });
        }
      }

      Object.assign(lectureInvitationMoney, updateLectureInvitationMoneyDto);

      const updatedLectureInvitationMoney =
        await this.lectureInvitationMoneyRepository.save(
          lectureInvitationMoney,
        );

      return updatedLectureInvitationMoney;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi cập nhật tiền mời giảng', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Tiền mời giảng đã tồn tại',
        });
      }
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật tiền mời giảng',
      });
    }
  }

  async softRemove(id: string) {
    try {
      const lectureInvitationMoney = await this.findOne(id);

      await this.lectureInvitationMoneyRepository.softRemove(
        lectureInvitationMoney,
      );

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm tiền mời giảng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa mềm tiền mời giảng',
      });
    }
  }

  async hardRemove(id: string) {
    try {
      const lectureInvitationMoney = await this.findOne(id, true);

      await this.lectureInvitationMoneyRepository.remove(
        lectureInvitationMoney,
      );

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn tiền mời giảng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể xóa vĩnh viễn tiền mời giảng',
      });
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục tiền mời giảng ${id}`);
    try {
      const lectureInvitationMoney = await this.findOne(id, true);

      await this.lectureInvitationMoneyRepository.restore(id);

      return lectureInvitationMoney;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục tiền mời giảng', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể khôi phục tiền mời giảng',
      });
    }
  }

  async getDeletedRecords(queryDto: QueryLectureInvitationMoneyDeletedDto) {
    try {
      const { page = 1, limit = 10, search, academicCredentialId } = queryDto;
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        academicCredentialId: academicCredentialId || undefined,
        deletedAt: Not(IsNull()),
      };

      if (search) {
        whereCondition.educationalSystem = ILike(`%${search}%`);
      }

      Object.keys(whereCondition).forEach((key) => {
        if (whereCondition[key] === undefined) {
          delete whereCondition[key];
        }
      });

      const [data, total] =
        await this.lectureInvitationMoneyRepository.findAndCount({
          where: whereCondition,
          skip,
          take: limit,
          order: {
            deletedAt: 'DESC',
          },
          withDeleted: true,
          relations: { academicCredential: true },
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
      this.logger.error('Lỗi lấy danh sách tiền mời giảng đã xóa', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách tiền mời giảng đã xóa',
      });
    }
  }
}
