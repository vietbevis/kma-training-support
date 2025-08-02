import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StandardLectureHoursEntity } from 'src/database/entities/standard-lecture-hours.entity';
import { Repository } from 'typeorm';
import { UpdateStandardLectureHoursDto } from './standard-lecture-hours.dto';

@Injectable()
export class StandardLectureHoursService {
  private readonly logger = new Logger(StandardLectureHoursService.name);

  constructor(
    @InjectRepository(StandardLectureHoursEntity)
    private readonly standardLectureHoursRepository: Repository<StandardLectureHoursEntity>,
  ) {}

  async findOne() {
    try {
      const standardLectureHours =
        await this.standardLectureHoursRepository.findOne({
          where: {},
          order: {
            createdAt: 'DESC',
          },
        });

      if (!standardLectureHours) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy cấu hình số tiết định mức',
        });
      }

      return standardLectureHours;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin số tiết định mức', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy thông tin số tiết định mức',
      });
    }
  }

  async update(updateStandardLectureHoursDto: UpdateStandardLectureHoursDto) {
    try {
      let standardLectureHours =
        await this.standardLectureHoursRepository.findOne({
          where: {},
          order: {
            createdAt: 'DESC',
          },
        });

      if (!standardLectureHours) {
        // Nếu chưa có bản ghi, tạo mới
        this.logger.log('Tạo mới cấu hình số tiết định mức');
        standardLectureHours = this.standardLectureHoursRepository.create(
          updateStandardLectureHoursDto,
        );
      } else {
        // Nếu đã có bản ghi, cập nhật
        this.logger.log('Cập nhật cấu hình số tiết định mức');
        Object.assign(standardLectureHours, updateStandardLectureHoursDto);
      }

      const updatedStandardLectureHours =
        await this.standardLectureHoursRepository.save(standardLectureHours);

      return updatedStandardLectureHours;
    } catch (error) {
      this.logger.error('Lỗi cập nhật số tiết định mức', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể cập nhật số tiết định mức',
      });
    }
  }
}
