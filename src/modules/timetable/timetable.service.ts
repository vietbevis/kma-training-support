import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { CourseEntity } from 'src/database/entities/course.entity';
import { StandardEntity } from 'src/database/entities/standard.entity';
import { TimeSlotEntity } from 'src/database/entities/timeslot.entity';
import { TimetableEntity } from 'src/database/entities/timetable.entity';
import { CreateStandardDto } from 'src/modules/standard/standard.dto';
import { KyHoc } from 'src/shared/enums/semester.enum';
import {
  Between,
  DataSource,
  EntityManager,
  ILike,
  In,
  Not,
  Repository,
} from 'typeorm';
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
    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async createWithManager(
    createTimetableDto: CreateTimetableDto,
    manager: EntityManager,
  ): Promise<TimetableEntity> {
    const { detailTimeSlots = [], ...timetableData } = createTimetableDto;

    // Check for duplicate combination of className, semester, academicYearId
    const existingTimetable = await manager.findOne(TimetableEntity, {
      where: {
        className: createTimetableDto.className,
        semester: createTimetableDto.semester,
        academicYearId: createTimetableDto.academicYearId,
      },
    });

    if (existingTimetable) {
      throw new ConflictException(
        `Thời khóa biểu đã tồn tại cho lớp "${createTimetableDto.className}" trong kì học ${createTimetableDto.semester} năm học này`,
      );
    }

    // Batch check conflicts for real rooms only
    const realRoomSlots = detailTimeSlots.filter((slot) =>
      /^[0-9]/.test(slot.roomName),
    );

    if (realRoomSlots.length > 0) {
      // Build a single query to check all conflicts at once
      const conflictConditions = realRoomSlots.map((slot) => ({
        roomName: slot.roomName,
        buildingName: slot.buildingName || 'Chung',
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        startDate: slot.startDate,
        endDate: slot.endDate,
      }));

      const conflicts = await this.batchCheckConflicts(
        conflictConditions,
        manager,
      );
      if (conflicts.length > 0) {
        throw new ConflictException(
          'Phòng học đã có lịch trùng với thời gian này',
        );
      }
    }

    // Save timetable first
    const timetable = manager.create(TimetableEntity, timetableData);
    const savedTimetable = await manager.save(TimetableEntity, timetable);

    if (detailTimeSlots.length === 0) {
      return savedTimetable;
    }

    // Prepare unique building and classroom names
    const buildingClassroomMap = new Map<string, Set<string>>();

    for (const slot of detailTimeSlots) {
      const buildingName =
        slot.buildingName && slot.buildingName.trim() !== ''
          ? slot.buildingName.trim()
          : 'Chung';
      const roomName = slot.roomName.trim();

      if (!buildingClassroomMap.has(buildingName)) {
        buildingClassroomMap.set(buildingName, new Set());
      }
      buildingClassroomMap.get(buildingName)!.add(roomName);
    }

    // Batch load all needed buildings with classrooms
    const buildingNames = Array.from(buildingClassroomMap.keys());
    const existingBuildings = await manager.find(BuildingEntity, {
      where: { name: In(buildingNames) },
      relations: { classrooms: true },
    });

    const buildingMap = new Map<string, BuildingEntity>();
    existingBuildings.forEach((b) => buildingMap.set(b.name, b));

    // Prepare buildings and classrooms to insert
    const buildingsToInsert: BuildingEntity[] = [];
    const newClassroomsPerBuilding: Array<{
      buildingName: string;
      roomNames: string[];
    }> = [];

    for (const [buildingName, roomNames] of buildingClassroomMap) {
      let building = buildingMap.get(buildingName);

      if (!building) {
        building = manager.create(BuildingEntity, { name: buildingName });
        buildingsToInsert.push(building);
        building.classrooms = [];
      }

      const existingRoomNames = new Set(
        (building.classrooms || []).map((c) => c.name),
      );

      const newRoomNames: string[] = [];
      for (const roomName of roomNames) {
        if (!existingRoomNames.has(roomName)) {
          newRoomNames.push(roomName);
        }
      }

      if (newRoomNames.length > 0) {
        newClassroomsPerBuilding.push({
          buildingName,
          roomNames: newRoomNames,
        });
      }

      buildingMap.set(buildingName, building);
    }

    // First, batch insert new buildings to get their IDs
    if (buildingsToInsert.length > 0) {
      const savedBuildings = await manager.save(
        BuildingEntity,
        buildingsToInsert,
      );
      savedBuildings.forEach((b) => buildingMap.set(b.name, b));
    }

    // Now create and insert classrooms with proper building IDs
    const classroomsToInsert: ClassroomEntity[] = [];
    for (const { buildingName, roomNames } of newClassroomsPerBuilding) {
      const building = buildingMap.get(buildingName)!;

      for (const roomName of roomNames) {
        const classroom = manager.create(ClassroomEntity, {
          name: roomName,
          type: buildingName === 'Chung' ? roomName : 'Phòng học',
          buildingId: building.id,
        });
        classroomsToInsert.push(classroom);

        if (!building.classrooms) {
          building.classrooms = [];
        }
        building.classrooms.push(classroom);
      }
    }

    if (classroomsToInsert.length > 0) {
      await manager.save(ClassroomEntity, classroomsToInsert);
    }

    // Create classroom lookup map for quick access
    const classroomLookup = new Map<string, string>();
    for (const building of buildingMap.values()) {
      for (const classroom of building.classrooms || []) {
        const key = `${building.name}:${classroom.name}`;
        classroomLookup.set(key, classroom.id);
      }
    }

    // Batch create all timeslots
    const timeSlotEntities = detailTimeSlots.map((slot) => {
      const buildingName =
        slot.buildingName && slot.buildingName.trim() !== ''
          ? slot.buildingName.trim()
          : 'Chung';
      const classroomKey = `${buildingName}:${slot.roomName}`;

      return manager.create(TimeSlotEntity, {
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        classroomId: classroomLookup.get(classroomKey),
        startDate: new Date(slot.startDate),
        endDate: new Date(slot.endDate),
        timetableId: savedTimetable.id,
      });
    });

    // Batch insert all timeslots
    const savedTimeSlots = await manager.save(TimeSlotEntity, timeSlotEntities);
    savedTimetable.timeSlots = savedTimeSlots;

    return savedTimetable;
  }

  private async batchCheckConflicts(
    conflictChecks: TimetableConflictCheckDto[],
    manager: EntityManager,
  ): Promise<TimeSlotEntity[]> {
    if (conflictChecks.length === 0) return [];

    // Build a complex OR condition for all conflict checks
    const queryBuilder = manager
      .createQueryBuilder(TimeSlotEntity, 'timeSlot')
      .innerJoin('timeSlot.classroom', 'classroom')
      .innerJoin('classroom.building', 'building');

    const whereConditions: string[] = [];
    const parameters: any = {};

    conflictChecks.forEach((check, index) => {
      if (check.buildingName === 'Chung') {
        return;
      }

      const condition = `(
        classroom.name = :roomName${index} AND
        building.name = :buildingName${index} AND
        timeSlot.dayOfWeek = :dayOfWeek${index} AND
        timeSlot.timeSlot = :timeSlot${index} AND
        timeSlot.startDate <= :endDate${index} AND
        timeSlot.endDate >= :startDate${index}
      )`;

      whereConditions.push(condition);
      parameters[`roomName${index}`] = check.roomName;
      parameters[`buildingName${index}`] = check.buildingName;
      parameters[`dayOfWeek${index}`] = check.dayOfWeek;
      parameters[`timeSlot${index}`] = check.timeSlot;
      parameters[`startDate${index}`] = check.startDate;
      parameters[`endDate${index}`] = check.endDate;
    });

    if (whereConditions.length > 0) {
      queryBuilder.where(`(${whereConditions.join(' OR ')})`, parameters);
    }

    return await queryBuilder.getMany();
  }

  async create(
    createTimetableDto: CreateTimetableDto,
  ): Promise<TimetableEntity> {
    return await this.dataSource.transaction(async (manager) => {
      return await this.createWithManager(createTimetableDto, manager);
    });
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
        course: {
          facultyDepartment: true,
        },
        academicYear: true,
      },
      skip,
      take: limit,
      order: {
        className: 'ASC',
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
        timeSlots: true,
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
    const {
      courseId,
      academicYearId,
      actualHours,
      studentCount,
      className,
      semester,
      ...rest
    } = updateTimetableDto;

    // Check for duplicate combination if className, semester, or academicYearId changes
    if (
      (className && className !== timetable.className) ||
      (semester && semester !== timetable.semester) ||
      (academicYearId && academicYearId !== timetable.academicYearId)
    ) {
      const duplicateCheckClassName = className || timetable.className;
      const duplicateCheckSemester = semester || timetable.semester;
      const duplicateCheckAcademicYearId =
        academicYearId || timetable.academicYearId;

      const existingTimetable = await this.timetableRepository.findOne({
        where: {
          className: duplicateCheckClassName,
          semester: duplicateCheckSemester,
          academicYearId: duplicateCheckAcademicYearId,
          id: Not(id), // Exclude current timetable
        },
      });

      if (existingTimetable) {
        throw new ConflictException(
          `Thời khóa biểu đã tồn tại cho lớp "${duplicateCheckClassName}" trong kì học ${duplicateCheckSemester} năm học này`,
        );
      }
    }

    // Update crowd class coefficient if student count changes
    if (studentCount && studentCount !== timetable.studentCount) {
      timetable.studentCount = studentCount;
      // Update HSLĐ based on student count
      switch (true) {
        case studentCount >= 101:
          timetable.crowdClassCoefficient = 1.5;
          break;
        case studentCount >= 81:
          timetable.crowdClassCoefficient = 1.4;
          break;
        case studentCount >= 66:
          timetable.crowdClassCoefficient = 1.3;
          break;
        case studentCount >= 51:
          timetable.crowdClassCoefficient = 1.2;
          break;
        case studentCount >= 41:
          timetable.crowdClassCoefficient = 1.1;
          break;
        default:
          timetable.crowdClassCoefficient = 1;
      }
    }

    // Batch check for academic year and course if needed
    const entitiesToCheck: Promise<any>[] = [];

    if (academicYearId && academicYearId !== timetable.academicYearId) {
      entitiesToCheck.push(
        this.academicYearRepository
          .findOne({ where: { id: academicYearId } })
          .then((year) => {
            if (!year) throw new NotFoundException('Năm học không tồn tại');
            timetable.academicYearId = year.id;
          }),
      );
    }

    if (courseId && courseId !== timetable.courseId) {
      entitiesToCheck.push(
        this.courseRepository
          .findOne({ where: { id: courseId } })
          .then((course) => {
            if (!course) throw new NotFoundException('Học phần không tồn tại');
            timetable.courseId = course.id;
          }),
      );
    }

    if (entitiesToCheck.length > 0) {
      await Promise.all(entitiesToCheck);
    }

    // Update standard hours if needed
    if (
      (actualHours && actualHours !== timetable.actualHours) ||
      (studentCount && studentCount !== timetable.studentCount)
    ) {
      timetable.actualHours = actualHours || timetable.actualHours;
      timetable.standardHours =
        timetable.actualHours *
        timetable.crowdClassCoefficient *
        timetable.overtimeCoefficient;
    }

    // Update remaining fields
    if (className) timetable.className = className;
    if (semester) timetable.semester = semester;

    Object.assign(timetable, rest);
    return await this.timetableRepository.save(timetable);
  }

  async remove(id: string): Promise<void> {
    const result = await this.timetableRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy thời khóa biểu');
    }
  }

  async uploadFromExcel(uploadDto: TimetableUploadDto): Promise<{
    success: number;
    errors: Array<{ row: number; data: TimetableUploadDataDto; error: string }>;
  }> {
    const results = {
      success: 0,
      errors: [] as Array<{
        row: number;
        data: TimetableUploadDataDto;
        error: string;
      }>,
    };

    await this.dataSource.transaction(async (manager) => {
      // Pre-load all needed data to minimize queries
      const courseCodeSet = new Set<string>();
      const yearCodeSet = new Set<string>();

      for (const item of uploadDto.data) {
        courseCodeSet.add(item.courseCode);
        const yearCode = this.extractSchoolYear(item.startDate);
        yearCodeSet.add(yearCode);
      }

      // Batch load existing courses and academic years
      const [existingCourses, existingYears] = await Promise.all([
        manager.find(CourseEntity, {
          where: { courseCode: In(Array.from(courseCodeSet)) },
        }),
        manager.find(AcademicYearEntity, {
          where: { yearCode: In(Array.from(yearCodeSet)) },
        }),
      ]);

      const courseMap = new Map(existingCourses.map((c) => [c.courseCode, c]));
      const yearMap = new Map(existingYears.map((y) => [y.yearCode, y]));

      // Prepare entities to batch insert
      const coursesToInsert: CourseEntity[] = [];
      const yearsToInsert: AcademicYearEntity[] = [];
      const timetablesToProcess: Array<{
        index: number;
        data: TimetableUploadDataDto;
        dto: CreateTimetableDto;
      }> = [];

      // Process each row
      for (const [index, item] of uploadDto.data.entries()) {
        try {
          const semester = this.getSemester(item.startDate, item.endDate);
          const yearCode = this.extractSchoolYear(item.startDate);
          const classType = item.classType.toUpperCase();

          // Get or prepare course
          let course = courseMap.get(item.courseCode);
          if (!course) {
            course = manager.create(CourseEntity, {
              courseCode: item.courseCode,
              courseName: item.className
                .replace(/(-\d+-\d+.*|\(.*)$/, '')
                .trim(),
              credits: item.credits,
              semester,
            });
            coursesToInsert.push(course);
            courseMap.set(item.courseCode, course);
          }

          // Get or prepare academic year
          let year = yearMap.get(yearCode);
          if (!year) {
            year = manager.create(AcademicYearEntity, { yearCode });
            yearsToInsert.push(year);
            yearMap.set(yearCode, year);
          }

          const createDto: CreateTimetableDto = {
            className: item.className,
            classType,
            semester,
            studentCount: item.studentCount,
            theoryHours: item.theoryHours,
            crowdClassCoefficient: item.crowdClassCoefficient,
            actualHours: item.actualHours,
            overtimeCoefficient: item.overtimeCoefficient,
            standardHours: item.standardHours,
            lecturerName: item.lecturerName,
            startDate: item.startDate,
            endDate: item.endDate,
            detailTimeSlots: item.detailTimeSlots,
            courseId: course.id,
            academicYearId: year.id,
          };

          timetablesToProcess.push({ index, data: item, dto: createDto });
        } catch (error: any) {
          results.errors.push({
            row: index + 1,
            data: item,
            error: error.message,
          });
        }
      }

      // Batch insert new courses and years
      if (coursesToInsert.length > 0) {
        const savedCourses = await manager.save(CourseEntity, coursesToInsert);
        savedCourses.forEach((c) => courseMap.set(c.courseCode, c));
      }

      if (yearsToInsert.length > 0) {
        const savedYears = await manager.save(
          AcademicYearEntity,
          yearsToInsert,
        );
        savedYears.forEach((y) => yearMap.set(y.yearCode, y));
      }

      // Update IDs and create timetables
      for (const { index, data, dto } of timetablesToProcess) {
        try {
          // Update with actual saved IDs
          dto.courseId = courseMap.get(data.courseCode)!.id;
          dto.academicYearId = yearMap.get(
            this.extractSchoolYear(data.startDate),
          )!.id;
          await this.createWithManager(dto, manager);
          results.success++;
        } catch (error: any) {
          results.errors.push({
            row: index + 1,
            data,
            error: error.message,
          });
        }
      }
    });

    return results;
  }

  private extractSchoolYear(startDate: string): string {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${startDate}`);
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    let startYear: number;
    let endYear: number;

    if (month >= 8 && month <= 12) {
      startYear = year;
      endYear = year + 1;
    } else {
      startYear = year - 1;
      endYear = year;
    }

    return `${startYear}-${endYear}`;
  }

  private getSemester(startDateStr: string, endDateStr: string): KyHoc {
    const startMonth = new Date(startDateStr).getMonth() + 1;
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
      case startMonth >= 8 && endMonth <= 12:
        return KyHoc.KI_1_2;
      case startMonth >= 1 && endMonth <= 7:
        return KyHoc.KI_2_2;
      default:
        return KyHoc.KI_2_2;
    }
  }

  async addToStandard(): Promise<{
    success: number;
    skipped: number;
    errors: Array<{ timetableId: string; className: string; error: string }>;
  }> {
    const results = {
      success: 0,
      skipped: 0,
      errors: [] as Array<{
        timetableId: string;
        className: string;
        error: string;
      }>,
    };

    return await this.dataSource.transaction(async (manager) => {
      // Tìm tất cả timetables chưa được thêm vào standard
      const timetables = await manager.find(TimetableEntity, {
        where: {
          isStandard: false,
        },
        relations: {
          course: true,
          academicYear: true,
        },
      });

      for (const timetable of timetables) {
        try {
          // Kiểm tra xem standard đã tồn tại chưa
          const existingStandard = await manager.findOne(StandardEntity, {
            where: {
              className: timetable.className,
              semester: timetable.semester,
              academicYearId: timetable.academicYearId || undefined,
            },
          });

          if (existingStandard) {
            // Nếu đã tồn tại, bỏ qua và đánh dấu isStandard = true
            timetable.isStandard = true;
            await manager.save(TimetableEntity, timetable);
            results.skipped++;
            continue;
          }

          // Helper function để convert date sang string format yyyy-MM-dd
          const formatDateToString = (date: Date | string | null | undefined): string | undefined => {
            if (!date) return undefined;
            if (typeof date === 'string') {
              // Nếu đã là string, kiểm tra format và return
              // Có thể là 'yyyy-MM-dd' hoặc cần parse
              if (date.includes('T')) {
                return date.split('T')[0];
              }
              return date;
            }
            if (date instanceof Date) {
              return date.toISOString().split('T')[0];
            }
            return undefined;
          };

          // Tạo CreateStandardDto từ timetable
          const createStandardDto: CreateStandardDto = {
            className: timetable.className,
            semester: timetable.semester,
            classType: timetable.classType,
            studentCount: timetable.studentCount,
            theoryHours: timetable.theoryHours,
            crowdClassCoefficient: timetable.crowdClassCoefficient,
            actualHours: timetable.actualHours,
            overtimeCoefficient: timetable.overtimeCoefficient,
            standardHours: timetable.standardHours,
            startDate: formatDateToString(timetable.startDate),
            endDate: formatDateToString(timetable.endDate),
            lecturerName: timetable.lecturerName,
            courseId: timetable.courseId || undefined,
            academicYearId: timetable.academicYearId || undefined,
          };

          // Tạo standard entity
          const standard = manager.create(StandardEntity, createStandardDto);
          await manager.save(StandardEntity, standard);

          // Đánh dấu timetable đã được thêm vào standard
          timetable.isStandard = true;
          await manager.save(TimetableEntity, timetable);

          results.success++;
        } catch (error: any) {
          results.errors.push({
            timetableId: timetable.id,
            className: timetable.className,
            error: error.message || 'Lỗi không xác định',
          });
        }
      }

      return results;
    });
  }
}
