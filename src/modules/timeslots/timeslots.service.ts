import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import sortEdges from 'src/shared/utils/sortEdges';
import { Repository } from 'typeorm';

@Injectable()
export class TimeslotsService {
  private readonly logger = new Logger(TimeslotsService.name);

  constructor(
    @InjectRepository(TimeSlotEntity)
    private readonly timeSlotRepository: Repository<TimeSlotEntity>,
  ) {}

  async getAllTimeSlots(): Promise<string[]> {
    try {
      const rows = await this.timeSlotRepository
        .createQueryBuilder('ts')
        .select('DISTINCT ts.timeSlot', 'timeSlot')
        .orderBy('ts.timeSlot', 'ASC')
        .getRawMany<{ timeSlot: string }>();

      return sortEdges(rows.map((r) => r.timeSlot));
    } catch (error) {
      this.logger.error('Lỗi lấy danh sách ca học', error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Không thể lấy danh sách ca học',
      });
    }
  }
}
