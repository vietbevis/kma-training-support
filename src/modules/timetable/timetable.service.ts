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
    if (createTimetableDto.classroomId) {
      await this.checkConflict({
        classroomId: createTimetableDto.classroomId,
        dayOfWeek: createTimetableDto.dayOfWeek,
        timeSlot: createTimetableDto.timeSlot,
        startDate: createTimetableDto.startDate,
        endDate: createTimetableDto.endDate,
      });
    }

    const timetable = this.timetableRepository.create(createTimetableDto);
    return await this.timetableRepository.save(timetable);
  }

  async findAll(query: TimetableQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<TimetableEntity> = {};

    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }
    if (filters.semester) {
      where.semester = filters.semester;
    }
    if (filters.dayOfWeek) {
      where.dayOfWeek = filters.dayOfWeek;
    }
    if (filters.classroomId) {
      where.classroomId = filters.classroomId;
    }
    if (filters.lecturerId) {
      where.lecturerId = filters.lecturerId;
    }
    if (filters.className) {
      where.className = Like(`%${filters.className}%`);
    }
    if (filters.startDate && filters.endDate) {
      where.startDate = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    }

    const [data, total] = await this.timetableRepository.findAndCount({
      where,
      relations: [
        'course',
        'academicYear',
        'facultyDepartment',
        'classroom',
        'lecturer',
      ],
      skip,
      take: limit,
      order: { dayOfWeek: 'ASC', timeSlot: 'ASC' },
    });

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
      relations: [
        'course',
        'academicYear',
        'facultyDepartment',
        'classroom',
        'lecturer',
      ],
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

    // Check for conflicts if relevant fields are being updated
    if (
      updateTimetableDto.classroomId ||
      updateTimetableDto.dayOfWeek ||
      updateTimetableDto.timeSlot ||
      updateTimetableDto.startDate ||
      updateTimetableDto.endDate
    ) {
      await this.checkConflict({
        classroomId: updateTimetableDto.classroomId || timetable.classroomId!,
        dayOfWeek: updateTimetableDto.dayOfWeek || timetable.dayOfWeek,
        timeSlot: updateTimetableDto.timeSlot || timetable.timeSlot,
        startDate:
          updateTimetableDto.startDate || timetable.startDate.toISOString(),
        endDate: updateTimetableDto.endDate || timetable.endDate.toISOString(),
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
    const where: FindOptionsWhere<TimetableEntity> = {
      classroomId: conflictDto.classroomId,
      dayOfWeek: conflictDto.dayOfWeek,
      timeSlot: conflictDto.timeSlot,
    };

    // Check for date overlap
    const startDate = new Date(conflictDto.startDate);
    const endDate = new Date(conflictDto.endDate);

    const conflictingSchedules = await this.timetableRepository
      .createQueryBuilder('timetable')
      .where('timetable.classroomId = :classroomId', {
        classroomId: conflictDto.classroomId,
      })
      .andWhere('timetable.dayOfWeek = :dayOfWeek', {
        dayOfWeek: conflictDto.dayOfWeek,
      })
      .andWhere('timetable.timeSlot = :timeSlot', {
        timeSlot: conflictDto.timeSlot,
      })
      .andWhere(
        '(timetable.startDate <= :endDate AND timetable.endDate >= :startDate)',
        { startDate, endDate },
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
    // Calculate start and end of week
    const startOfWeek = new Date(week);
    startOfWeek.setDate(week.getDate() - week.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const schedules = await this.timetableRepository.find({
      where: {
        academicYearId,
        semester: semester as any,
        startDate: Between(startOfWeek, endOfWeek),
      },
      relations: ['course', 'classroom', 'lecturer'],
      order: { dayOfWeek: 'ASC', timeSlot: 'ASC' },
    });

    // Group by day of week
    const weeklySchedule: any = {};
    for (let day = 2; day <= 7; day++) {
      // Monday to Saturday
      weeklySchedule[day] = schedules.filter((s) => s.dayOfWeek === day);
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

    // Find classroom by name (if not LMS or online)
    // Tìm phòng học nếu roomName # LMS và không rỗng -> tìm trong DB
    // Nếu không có phòng hoặc lớp online -> để classroomID = undefined
    /*
    Sẽ sửa
    let classroomId: string | undefined;
    if (data.roomName !== 'LMS' && data.roomName.trim() !== '') {
      const classroom = await this.classroomRepository.findOne({
        where: { name: Like(`%${data.roomName}%`) },
      });
      classroomId = classroom?.id;
    }

    // Parse dates
    const startDate = this.parseExcelDate(data.startDate);
    const endDate = this.parseExcelDate(data.endDate);

    // tạo DTO 
    const createDto: CreateTimetableDto = {
      className: data.className,
      semester,
      classType,
      studentCount: data.studentCount,
      theoryHours: data.theoryHours,
      crowdClassCoefficient: data.crowdClassCoefficient,
      actualHours: data.actualHours,
      standardHours: data.standardHours,
      hoursPerWeek: data.hoursPerWeek,
      dayOfWeek: data.dayOfWeek as DayOfWeek,
      timeSlot: data.timeSlot,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      courseId: course.id,
      academicYearId,
      classroomId,
      roomName: data.roomName,
    };

    await this.create(createDto);
    */
  }

  // chuyển đổi chuỗi ngày từ Excel thành đối tượng Date của JS
  private parseExcelDate(dateStr: string): Date {
    // Parse date from Excel format input (DD/MM/YY)
    // tách chuỗi theo /
    const parts = dateStr.split('/');
    // nếu không đủ 3 phần -> throw error
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }

    // chuyển day, month, year
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    let year = parseInt(parts[2]);

    // Handle 2-digit year
    if (year < 100) {
      year += 2000;
    }

    return new Date(year, month, day);
  }
}
