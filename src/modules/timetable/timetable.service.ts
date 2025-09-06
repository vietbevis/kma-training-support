import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { CourseEntity } from 'src/database/entities/course.entity';
import { TimetableEntity } from 'src/database/entities/timetable.entity';
import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';
import { Between, FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  CreateTimetableDto,
  TimetableConflictCheckDto,
  TimetableQueryDto,
  TimetableUploadDataDto,
  TimetableUploadDto,
  UpdateTimetableDto,
} from './timetable.dto';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntity)
    private readonly timetableRepository: Repository<TimetableEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepository: Repository<AcademicYearEntity>,
    @InjectRepository(ClassroomEntity)
    private readonly classroomRepository: Repository<ClassroomEntity>,
  ) {}

  async create(
    createTimetableDto: CreateTimetableDto,
  ): Promise<TimetableEntity> {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: createTimetableDto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Học phần không tồn tại');
    }

    // Validate academic year exists
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: createTimetableDto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException('Năm học không tồn tại');
    }

    // Check for conflicts if classroom is provided
    if (
      createTimetableDto.detailTimeSlots &&
      createTimetableDto.detailTimeSlots.length > 0
    ) {
      for (const slot of createTimetableDto.detailTimeSlots) {
        await this.checkConflict({
          roomName: slot.roomName,
          dayOfWeek: slot.dayOfWeek,
          timeSlot: slot.timeSlot,
          startDate: slot.startDate,
          endDate: slot.endDate,
        });
      }
    }

    const timetable = this.timetableRepository.create(createTimetableDto);
    return await this.timetableRepository.save(timetable);
  }

  async findAll(query: TimetableQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const qb = this.timetableRepository
      .createQueryBuilder('timetable')
      .leftJoinAndSelect('timetable.course', 'course')
      .leftJoinAndSelect('timetable.academicYear', 'academicYear')
      .skip(skip)
      .take(limit);

    // áp dụng filter
    if (filters.courseId) {
      qb.andWhere('timetable.courseId = :courseId', {
        courseId: filters.courseId,
      });
    }
    if (filters.academicYearId) {
      qb.andWhere('timetable.academicYearId = :academicYearId', {
        academicYearId: filters.academicYearId,
      });
    }
    if (filters.semester) {
      qb.andWhere('timetable.semester = :semester', {
        semester: filters.semester,
      });
    }
    if (filters.className) {
      qb.andWhere('timetable.className ILIKE :className', {
        className: `%${filters.className}%`,
      });
    }
    if (filters.startDate && filters.endDate) {
      qb.andWhere('timetable.startDate BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    // order theo JSONB + className
    qb.addOrderBy(
      "CAST(timetable.detail_time_slots->0->>'dayOfWeek' AS INT)",
      'ASC',
    );
    qb.addOrderBy('timetable.className', 'ASC');

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<TimetableEntity> {
    const timetable = await this.timetableRepository.findOne({
      where: { id },
      relations: ['course', 'academicYear', 'facultyDepartment'],
    });

    if (!timetable) {
      throw new NotFoundException('Không tìm thấy thời khóa biểu');
    }

    return timetable;
  }

  async update(
    id: string,
    updateTimetableDto: UpdateTimetableDto,
  ): Promise<TimetableEntity> {
    const timetable = await this.findOne(id);

    // Nếu có detailTimeSlots mới thì check conflict theo dữ liệu mới
    const slotsToCheck = updateTimetableDto.detailTimeSlots?.length
      ? updateTimetableDto.detailTimeSlots
      : timetable.detailTimeSlots;

    for (const slot of slotsToCheck) {
      await this.checkConflict({
        roomName: slot.roomName,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        startDate: slot.startDate,
        endDate: slot.endDate,
        excludeId: id,
      });
    }

    Object.assign(timetable, updateTimetableDto);
    return await this.timetableRepository.save(timetable);
  }

  async remove(id: string): Promise<void> {
    const timetable = await this.findOne(id);
    await this.timetableRepository.remove(timetable);
  }

  async checkConflict(conflictDto: TimetableConflictCheckDto): Promise<void> {
    const startDate = new Date(conflictDto.startDate);
    const endDate = new Date(conflictDto.endDate);

    const conflictingSchedules = await this.timetableRepository
      .createQueryBuilder('timetable')
      .where(
        `
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(timetable.detail_time_slots) as slot
        WHERE slot->>'roomName' = :roomName
          AND slot->>'dayOfWeek' = :dayOfWeek
          AND slot->>'timeSlot' = :timeSlot
          AND (slot->>'startDate')::date <= :endDate
          AND (slot->>'endDate')::date >= :startDate
      )
    `,
        {
          roomName: conflictDto.roomName,
          dayOfWeek: conflictDto.dayOfWeek,
          timeSlot: conflictDto.timeSlot,
          startDate,
          endDate,
        },
      )
      .andWhere(conflictDto.excludeId ? 'timetable.id != :excludeId' : '1=1', {
        excludeId: conflictDto.excludeId,
      })
      .getMany();

    if (conflictingSchedules.length > 0) {
      throw new ConflictException(
        'Phòng học đã có lịch trùng với thời gian này',
      );
    }
  }

  // Lấy thời khóa biểu theo tuần
  async getWeeklySchedule(
  academicYearId: string,
  semester: string,
  week: Date,
): Promise<any> {
  // Tính ngày đầu tuần (thứ 2) và cuối tuần (chủ nhật)
  const startOfWeek = new Date(week);
  startOfWeek.setDate(week.getDate() - week.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const qb = this.timetableRepository.createQueryBuilder('timetable')
    .leftJoinAndSelect('timetable.course', 'course')
    .leftJoinAndSelect('timetable.academicYear', 'academicYear')
    // lọc theo năm học và kỳ học
    .where('timetable.academicYearId = :academicYearId', { academicYearId })
    .andWhere('timetable.semester = :semester', { semester })
    // check overlap với tuần (lịch kéo dài nhiều tuần)
    .andWhere('timetable.startDate <= :endOfWeek', { endOfWeek })
    .andWhere('timetable.endDate >= :startOfWeek', { startOfWeek })
    // sắp xếp theo JSONB (slot đầu tiên trong mảng)
    .orderBy("CAST(timetable.detail_time_slots->0->>'dayOfWeek' AS INT)", "ASC")
    .addOrderBy("timetable.detail_time_slots->0->>'timeSlot'", "ASC");

  const schedules = await qb.getMany();

  // Group lại theo dayOfWeek (lấy từ detailTimeSlots)
  const weeklySchedule: Record<number, TimetableEntity[]> = {};
  for (let day = 2; day <= 7; day++) {
    weeklySchedule[day] = schedules.filter((s) =>
      s.detailTimeSlots.some(slot => slot.dayOfWeek === day)
    );
  }

  return weeklySchedule;
}


  // Upload thời khóa biểu từ Excel
  // Duyệt qua tất cả các dòng dl được parse, xử lý từng dòng và ghi nhận kết quả
  async uploadFromExcel(uploadDto: TimetableUploadDto): Promise<{
    success: number;
    errors: Array<{ row: number; data: TimetableUploadDataDto; error: string }>;
  }> {
    const results: {
      success: number;
      errors: Array<{
        row: number;
        data: TimetableUploadDataDto;
        error: string;
      }>;
    } = { success: 0, errors: [] };

    for (const [index, item] of uploadDto.data.entries()) {
      try {
        // xử lý và lưu vào DB
        await this.processExcelRow(
          item,
          uploadDto.semester,
          uploadDto.academicYearId,
        );
        // nếu thành công -> tăng success
        results.success++;
      } catch (error: any) {
        // lỗi -> ghi nhận row, data và error.message vào results.errors
        results.errors.push({
          row: index + 1,
          data: item,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Xử lý 1 dòng dữ liệu Excel, ánh xạ sang CreateTimeTableDto rồi gọi hàm create để lưu vào DB
  private async processExcelRow(
    data: TimetableUploadDataDto,
    semester: any,
    academicYearId: string,
  ): Promise<void> {
    // Find course by code
    // Tìm học phần (course) theo courseCode
    const course = await this.courseRepository.findOne({
      where: { courseCode: data.courseCode },
    });

    // nếu không có -> throw error vì chưa có học phần đó mà đã có thời khóa biểu về nó
    if (!course) {
      throw new Error(`Không tìm thấy học phần với mã: ${data.courseCode}`);
    }

    // Map class type
    // Xác định loại lớp
    const classType = data.classType.toUpperCase();

    // tạo DTO
    const createDto: CreateTimetableDto = {
      className: data.className,
      semester,
      classType,
      studentCount: data.studentCount,
      theoryHours: data.theoryHours,
      crowdClassCoefficient: data.crowdClassCoefficient,
      actualHours: data.actualHours,
      overtimeCoefficient: data.overtimeCoefficient,
      standardHours: data.standardHours,
      lecturerName: data.lecturerName,
      startDate: data.startDate,
      endDate: data.endDate,
      detailTimeSlots: data.detailTimeSlots,
      courseId: course.id,
      academicYearId,
    };

    await this.create(createDto);
  }

  private parseExcelDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
}
