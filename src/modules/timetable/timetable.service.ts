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
import { KyHoc } from 'src/shared/enums/semester.enum';
import { Between, DataSource, EntityManager, ILike, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
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
          buildingName: slot.buildingName || '',
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

  // Phiên bản create sử dụng EntityManager cho transaction
  private async createWithManager(
    createTimetableDto: CreateTimetableDto,
    manager: EntityManager,
  ): Promise<TimetableEntity> {
    // Validate course exists
    const course = await manager.findOne(CourseEntity, {
      where: { id: createTimetableDto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Học phần không tồn tại');
    }

    // Validate academic year exists
    const academicYear = await manager.findOne(AcademicYearEntity, {
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
        await this.checkConflictWithManager(
          {
            roomName: slot.roomName,
            buildingName: slot.buildingName || '',
            dayOfWeek: slot.dayOfWeek,
            timeSlot: slot.timeSlot,
            startDate: slot.startDate,
            endDate: slot.endDate,
          },
          manager,
        );
      }
    }

    const timetable = manager.create(TimetableEntity, createTimetableDto);
    return await manager.save(TimetableEntity, timetable);
  }

  async findAll(query: TimetableQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.timetableRepository.findAndCount({
      where: {
        className: filters.className
          ? ILike(`%${filters.className}%`)
          : undefined,
        courseId: filters.courseId || undefined,
        academicYearId: filters.academicYearId || undefined,
        semester: filters.semester || undefined,
        startDate:
          filters.startDate && filters.endDate
            ? Between(new Date(filters.startDate), new Date(filters.endDate))
            : undefined,
      },
      relations: {
        course: true,
        academicYear: true,
      },
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
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
      relations: {
        course: true,
        academicYear: true,
      },
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

    // Nếu có detailTimeSlots mới thì check conflict
    if (updateTimetableDto.detailTimeSlots?.length) {
      for (const slot of updateTimetableDto.detailTimeSlots) {
        await this.checkConflict({
          roomName: slot.roomName,
          buildingName: slot.buildingName || '',
          dayOfWeek: slot.dayOfWeek,
          timeSlot: slot.timeSlot,
          startDate: slot.startDate,
          endDate: slot.endDate,
          excludeId: id,
        });
      }
    }

    // Merge dữ liệu mới vào entity cũ
    Object.assign(timetable, updateTimetableDto);

    return await this.timetableRepository.save(timetable);
  }

  async remove(id: string): Promise<void> {
    try {
      const timetable = await this.findOne(id);
      await this.timetableRepository.remove(timetable);
    } catch (error) {
      throw new NotFoundException('Không tìm thấy thời khóa biểu');
    }
  }

  async checkConflict(conflictDto: TimetableConflictCheckDto): Promise<void> {
    // Chỉ check nếu roomName bắt đầu bằng số
    const isRealRoom = /^[0-9]/.test(conflictDto.roomName);
    if (!isRealRoom) {
      return;
    }

    const conflictingSchedules = await this.timetableRepository
      .createQueryBuilder('timetable')
      .where(
        `
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(timetable.detail_time_slots) as slot
        WHERE slot->>'roomName' = :roomName
          AND slot->>'buildingName' = :buildingName
          AND (slot->>'dayOfWeek')::int = :dayOfWeek
          AND slot->>'timeSlot' = :timeSlot
          AND (slot->>'startDate')::date <= :endDate
          AND (slot->>'endDate')::date >= :startDate
      )
    `,
        {
          roomName: conflictDto.roomName,
          buildingName: conflictDto.buildingName,
          dayOfWeek: conflictDto.dayOfWeek,
          timeSlot: conflictDto.timeSlot,
          startDate: conflictDto.startDate,
          endDate: conflictDto.endDate,
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

  // Phiên bản checkConflict sử dụng EntityManager cho transaction
  private async checkConflictWithManager(
    conflictDto: TimetableConflictCheckDto,
    manager: EntityManager,
  ): Promise<void> {
    // Chỉ check nếu roomName bắt đầu bằng số
    const isRealRoom = /^[0-9]/.test(conflictDto.roomName);
    if (!isRealRoom) {
      return;
    }

    const conflictingSchedules = await manager
      .createQueryBuilder(TimetableEntity, 'timetable')
      .where(
        `
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(timetable.detail_time_slots) as slot
        WHERE slot->>'roomName' = :roomName
          AND slot->>'buildingName' = :buildingName
          AND (slot->>'dayOfWeek')::int = :dayOfWeek
          AND slot->>'timeSlot' = :timeSlot
          AND (slot->>'startDate')::date <= :endDate
          AND (slot->>'endDate')::date >= :startDate
      )
    `,
        {
          roomName: conflictDto.roomName,
          buildingName: conflictDto.buildingName,
          dayOfWeek: conflictDto.dayOfWeek,
          timeSlot: conflictDto.timeSlot,
          startDate: conflictDto.startDate,
          endDate: conflictDto.endDate,
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

    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    await this.dataSource.transaction(async (manager) => {
      for (const [index, item] of uploadDto.data.entries()) {
        try {
          // xử lý và lưu vào DB với transaction manager
          await this.processExcelRow(item, manager);
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
    });

    return results;
  }

  // Xử lý 1 dòng dữ liệu Excel, ánh xạ sang CreateTimeTableDto rồi gọi hàm create để lưu vào DB
  private async processExcelRow(
    data: TimetableUploadDataDto,
    manager: EntityManager,
  ): Promise<void> {
    const semester = getSemester(data.startDate, data.endDate);

    // Find course by code
    // 1. Tìm học phần (course) theo courseCode
    let course = await manager.findOne(CourseEntity, {
      where: { courseCode: data.courseCode },
    });

    if (!course) {
      try {
        course = manager.create(CourseEntity, {
          courseCode: data.courseCode,
          courseName: data.className.replace(/\s*\([^)]*\)\s*$/, ''),
          credits: data.credits,
          semester,
        });
        course = await manager.save(CourseEntity, course);
      } catch (error) {
        console.error(`Error creating course ${data.courseCode}:`, error);
        throw error; // hoặc return để không chạy tiếp
      }
    }

    // 2. Tìm hoặc tạo Academic Year nếu chưa có

    const academicYearId = await this.getOrCreateAcademicYear(data, manager);

    // Map class type
    // Xác định loại lớp
    const classType = data.classType.toUpperCase();

    // tạo DTO
    const createDto: CreateTimetableDto = {
      className: data.className,
      classType,
      semester,
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

    await this.createWithManager(createDto, manager);
  }

  private extractSchoolYear(className: string): string {
    // Bỏ phần (D601)
    const cleaned = className.replace(/\s*\([^)]*\)\s*$/, '');

    // Lấy số cuối cùng sau khi bỏ ngoặc
    const match = cleaned.match(/(\d+)(?!.*\d)/);
    if (!match)
      throw new Error(`Không tìm thấy số trong className: ${className}`);

    const number = parseInt(match[1], 10); // 25
    const startYear = number < 100 ? 2000 + number : number; // 2025
    const endYear = startYear + 1; // 2026

    return `${startYear}-${endYear}`;
  }

  private async getOrCreateAcademicYear(
    data: TimetableUploadDataDto,
    manager: EntityManager,
  ): Promise<string> {
    const extractedYear = this.extractSchoolYear(data.className);

    let year = await manager.findOne(AcademicYearEntity, {
      where: { yearCode: extractedYear },
    });
    if (!year) {
      year = manager.create(AcademicYearEntity, { yearCode: extractedYear });
      year = await manager.save(AcademicYearEntity, year);
    }
    return year.id;
  }
}

function getSemester(startDateStr: string, endDateStr: string): KyHoc {
  const startMonth = new Date(startDateStr).getMonth() + 1; // 1–12
  const endMonth = new Date(endDateStr).getMonth() + 1;

  switch (true) {
    case startMonth >= 8 && endMonth <= 10:
      return KyHoc.KI_1_1;

    case startMonth >= 10 && endMonth <= 12:
      return KyHoc.KI_1_2;

    case startMonth >= 1 && endMonth <= 4:
      return KyHoc.KI_2_1;

    case startMonth >= 4 && endMonth <= 7:
      return KyHoc.KI_2_2;

    // fallback
    case startMonth >= 8 && endMonth <= 12:
      return KyHoc.KI_1_2;

    case startMonth >= 1 && endMonth <= 7:
      return KyHoc.KI_2_2;

    default:
      // Nếu không rơi vào khoảng nào (ví dụ tháng 1), mặc định cho về "Kỳ 2 đợt 2"
      return KyHoc.KI_2_2;
  }
}
