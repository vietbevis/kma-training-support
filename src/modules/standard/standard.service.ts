import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYearEntity } from 'src/database/entities/academic-years.entity';
import { CourseEntity } from 'src/database/entities/course.entity';
import { StandardEntity } from 'src/database/entities/standard.entity';
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
  CreateStandardDto,
  StandardQueryDto,
  StandardUploadDataDto,
  StandardUploadDto,
  UpdateStandardDto,
} from './standard.dto';

@Injectable()
export class StandardService {
  constructor(
    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepository: Repository<AcademicYearEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async createWithManager(
    createStandardDto: CreateStandardDto,
    manager: EntityManager,
  ): Promise<StandardEntity> {
    // Destructure to remove detailTimeSlots from standardData
    const { detailTimeSlots, ...standardData } = createStandardDto;

    // Check for duplicate combination of className, semester, academicYearId
    const existingStandard = await manager.findOne(StandardEntity, {
      where: {
        className: createStandardDto.className,
        semester: createStandardDto.semester,
        academicYearId: createStandardDto.academicYearId,
      },
    });

    if (existingStandard) {
      throw new ConflictException(
        `Quy chuẩn đã tồn tại cho lớp "${createStandardDto.className}" trong kì học ${createStandardDto.semester} năm học này`,
      );
    }

    // Validate relationships if IDs are provided
    if (standardData.courseId) {
      const course = await manager.findOne(CourseEntity, {
        where: { id: standardData.courseId },
      });
      if (!course) {
        // Set to undefined if course doesn't exist
        standardData.courseId = undefined;
      }
    }

    if (standardData.academicYearId) {
      const academicYear = await manager.findOne(AcademicYearEntity, {
        where: { id: standardData.academicYearId },
      });
      if (!academicYear) {
        // Set to undefined if academic year doesn't exist
        standardData.academicYearId = undefined;
      }
    }

    // Calculate standardHours if all required fields are present
    if (
      standardData.actualHours &&
      standardData.crowdClassCoefficient &&
      standardData.overtimeCoefficient
    ) {
      standardData.standardHours =
        standardData.actualHours *
        standardData.crowdClassCoefficient *
        standardData.overtimeCoefficient;
    }

    // Create and save standard
    const standard = manager.create(StandardEntity, standardData);
    return await manager.save(StandardEntity, standard);
  }

  async create(createStandardDto: CreateStandardDto): Promise<StandardEntity> {
    return await this.dataSource.transaction(async (manager) => {
      return await this.createWithManager(createStandardDto, manager);
    });
  }

  async findAll(query: StandardQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.standardRepository.findAndCount({
      where: {
        className: filters.className
          ? ILike(`%${filters.className}%`)
          : undefined,
        lecturerName: filters.lecturerName
          ? ILike(`%${filters.lecturerName}%`)
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

  async findOne(id: string): Promise<StandardEntity> {
    const standard = await this.standardRepository.findOne({
      where: { id },
      relations: {
        course: true,
        academicYear: true,
      },
    });

    if (!standard) {
      throw new NotFoundException('Không tìm thấy quy chuẩn');
    }

    return standard;
  }

  async update(
    id: string,
    updateStandardDto: UpdateStandardDto,
  ): Promise<StandardEntity> {
    const standard = await this.findOne(id);
    const {
      courseId,
      academicYearId,
      actualHours,
      studentCount,
      className,
      semester,
      ...rest
    } = updateStandardDto;

    // Check for duplicate combination if className, semester, or academicYearId changes
    if (
      (className && className !== standard.className) ||
      (semester && semester !== standard.semester) ||
      (academicYearId && academicYearId !== standard.academicYearId)
    ) {
      const duplicateCheckClassName = className || standard.className;
      const duplicateCheckSemester = semester || standard.semester;
      const duplicateCheckAcademicYearId =
        academicYearId || standard.academicYearId;

      const existingStandard = await this.standardRepository.findOne({
        where: {
          className: duplicateCheckClassName,
          semester: duplicateCheckSemester,
          academicYearId: duplicateCheckAcademicYearId || undefined,
          id: Not(id), // Exclude current standard
        },
      });

      if (existingStandard) {
        throw new ConflictException(
          `Quy chuẩn đã tồn tại cho lớp "${duplicateCheckClassName}" trong kì học ${duplicateCheckSemester} năm học này`,
        );
      }
    }

    // Update student count and crowd class coefficient if student count changes
    if (studentCount !== undefined && studentCount !== standard.studentCount) {
      standard.studentCount = studentCount;
      // Update HSLĐ based on student count
      switch (true) {
        case studentCount >= 101:
          standard.crowdClassCoefficient = 1.5;
          break;
        case studentCount >= 81:
          standard.crowdClassCoefficient = 1.4;
          break;
        case studentCount >= 66:
          standard.crowdClassCoefficient = 1.3;
          break;
        case studentCount >= 51:
          standard.crowdClassCoefficient = 1.2;
          break;
        case studentCount >= 41:
          standard.crowdClassCoefficient = 1.1;
          break;
        default:
          standard.crowdClassCoefficient = 1.0;
      }
    }

    // Batch check for academic year and course if needed
    const entitiesToCheck: Promise<any>[] = [];

    if (academicYearId && academicYearId !== standard.academicYearId) {
      entitiesToCheck.push(
        this.academicYearRepository
          .findOne({ where: { id: academicYearId } })
          .then((year) => {
            if (!year) throw new NotFoundException('Năm học không tồn tại');
            standard.academicYearId = year.id;
          }),
      );
    }

    if (courseId && courseId !== standard.courseId) {
      entitiesToCheck.push(
        this.courseRepository
          .findOne({ where: { id: courseId } })
          .then((course) => {
            if (!course) throw new NotFoundException('Học phần không tồn tại');
            standard.courseId = course.id;
          }),
      );
    }

    if (entitiesToCheck.length > 0) {
      await Promise.all(entitiesToCheck);
    }

    // Update actual hours if provided
    if (actualHours !== undefined) {
      standard.actualHours = actualHours;
    }

    // Recalculate standard hours if all required fields are available
    if (
      standard.actualHours &&
      standard.crowdClassCoefficient &&
      standard.overtimeCoefficient
    ) {
      standard.standardHours =
        standard.actualHours *
        standard.crowdClassCoefficient *
        standard.overtimeCoefficient;
    }

    // Update remaining fields
    if (className) standard.className = className;
    if (semester) standard.semester = semester;

    Object.assign(standard, rest);
    return await this.standardRepository.save(standard);
  }

  async remove(id: string): Promise<void> {
    const result = await this.standardRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy quy chuẩn');
    }
  }

  async uploadFromWord(uploadDto: StandardUploadDto): Promise<{
    success: number;
    skipped: number;
    errors: Array<{ row: number; data: StandardUploadDataDto; error: string }>;
  }> {
    const results = {
      success: 0,
      skipped: 0,
      errors: [] as Array<{
        row: number;
        data: StandardUploadDataDto;
        error: string;
      }>,
    };

    await this.dataSource.transaction(async (manager) => {
      // Pre-load all needed data to minimize queries
      const courseCodeSet = new Set<string>();
      const courseNameSet = new Set<string>();
      const yearIdSet = new Set<string>();

      for (const item of uploadDto.data) {
        if (item.courseCode) {
          courseCodeSet.add(item.courseCode);
        }
        if (item.academicYearId) {
          yearIdSet.add(item.academicYearId);
        }
        // Extract course name for pre-loading
        const courseName = item.className
          .replace(/(-\d+-\d+.*|\(.*)$/, '')
          .trim();
        courseNameSet.add(courseName);
      }

      // Batch load existing courses and academic years
      const [existingCoursesByCodes, existingCoursesByNames, existingYears] =
        await Promise.all([
          courseCodeSet.size > 0
            ? manager.find(CourseEntity, {
                where: { courseCode: In(Array.from(courseCodeSet)) },
              })
            : Promise.resolve([]),
          courseNameSet.size > 0
            ? manager.find(CourseEntity, {
                where: { courseName: In(Array.from(courseNameSet)) },
                order: { createdAt: 'ASC' },
              })
            : Promise.resolve([]),
          yearIdSet.size > 0
            ? manager.find(AcademicYearEntity, {
                where: { yearCode: In(Array.from(yearIdSet)) },
              })
            : Promise.resolve([]),
        ]);

      const courseByCodeMap = new Map(
        existingCoursesByCodes.map((c) => [c.courseCode, c]),
      );
      // Create a map for courses by name+semester+credits
      const courseByNameMap = new Map<string, CourseEntity[]>();
      existingCoursesByNames.forEach((c) => {
        const key = `${c.courseName}|${c.semester}|${c.credits || 0}`;
        if (!courseByNameMap.has(key)) {
          courseByNameMap.set(key, []);
        }
        courseByNameMap.get(key)!.push(c);
      });
      const yearMap = new Map(existingYears.map((y) => [y.yearCode, y]));

      // Prepare entities to batch insert
      const coursesToInsert: CourseEntity[] = [];
      const yearsToInsert: AcademicYearEntity[] = [];
      const standardsToProcess: Array<{
        index: number;
        data: StandardUploadDataDto;
        dto: CreateStandardDto;
      }> = [];

      // Process each row
      for (const [index, item] of uploadDto.data.entries()) {
        try {
          // Parse semester from item.semester string or calculate from dates
          let semester: KyHoc;
          if (item.semester) {
            semester = this.parseSemesterString(item.semester);
          } else if (item.startDate && item.endDate) {
            semester = this.getSemester(item.startDate, item.endDate);
          } else {
            throw new Error('Thiếu thông tin kỳ học');
          }

          let courseId: string | undefined;
          let academicYearId: string | undefined;

          // Extract course name from className
          const courseName = item.className
            .replace(/(-\d+-\d+.*|\(.*)$/, '')
            .trim();

          // Try to find existing course by courseName, semester, and credits
          const courseKey = `${courseName}|${semester}|${item.credits || 0}`;
          let course: CourseEntity | undefined;

          // First, try to find in pre-loaded courses by name
          const coursesByName = courseByNameMap.get(courseKey);
          if (coursesByName && coursesByName.length > 0) {
            course = coursesByName[0]; // Take the first one
          }

          // If not found by name and courseCode is provided, try by courseCode
          if (!course && item.courseCode) {
            course = courseByCodeMap.get(item.courseCode);
            if (!course) {
              // Create new course if not exists
              course = manager.create(CourseEntity, {
                courseCode: item.courseCode,
                courseName,
                credits: item.credits || 0,
                semester,
              });
              coursesToInsert.push(course);
              courseByCodeMap.set(item.courseCode, course);
              // Also add to name map for future reference
              if (!courseByNameMap.has(courseKey)) {
                courseByNameMap.set(courseKey, []);
              }
              courseByNameMap.get(courseKey)!.push(course);
            }
          }

          // Set courseId if course is found
          if (course) {
            courseId = course.id;
          }

          // Handle academic year - only if academicYearId is provided
          if (item.academicYearId) {
            let year = yearMap.get(item.academicYearId);
            if (!year) {
              year = manager.create(AcademicYearEntity, {
                yearCode: item.academicYearId,
              });
              yearsToInsert.push(year);
              yearMap.set(item.academicYearId, year);
            }
            academicYearId = year.id;
          }

          const createDto: CreateStandardDto = {
            className: item.className,
            semester,
            classType: item.classType,
            studentCount: item.studentCount,
            theoryHours: item.theoryHours,
            crowdClassCoefficient: item.crowdClassCoefficient,
            actualHours: item.actualHours,
            overtimeCoefficient: item.overtimeCoefficient,
            standardHours: item.standardHours,
            lecturerName: item.lecturerName,
            startDate: item.startDate,
            endDate: item.endDate,
            courseId,
            academicYearId,
          };

          standardsToProcess.push({ index, data: item, dto: createDto });
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
        savedCourses.forEach((c) => {
          if (c.courseCode) {
            courseByCodeMap.set(c.courseCode, c);
          }
          const key = `${c.courseName}|${c.semester}|${c.credits || 0}`;
          if (!courseByNameMap.has(key)) {
            courseByNameMap.set(key, []);
          }
          courseByNameMap.get(key)!.push(c);
        });
      }

      if (yearsToInsert.length > 0) {
        const savedYears = await manager.save(
          AcademicYearEntity,
          yearsToInsert,
        );
        savedYears.forEach((y) => yearMap.set(y.yearCode, y));
      }

      // Update academicYearId first for all items
      for (const { data, dto } of standardsToProcess) {
        if (data.academicYearId && yearMap.has(data.academicYearId)) {
          dto.academicYearId = yearMap.get(data.academicYearId)!.id;
        }
      }

      // Batch check for existing standards to avoid duplicates
      const existingStandardsMap = new Map<string, StandardEntity>();

      if (standardsToProcess.length > 0) {
        const standardsToCheck = standardsToProcess.map((item) => ({
          className: item.dto.className,
          semester: item.dto.semester,
          academicYearId: item.dto.academicYearId,
        }));

        // Build query to check all at once
        const existingStandards = await manager
          .createQueryBuilder(StandardEntity, 'standard')
          .where(
            standardsToCheck
              .map(
                (_, i) =>
                  `(standard.className = :className${i} AND standard.semester = :semester${i} AND standard.academicYearId ${standardsToCheck[i].academicYearId ? `= :academicYearId${i}` : 'IS NULL'})`,
              )
              .join(' OR '),
            standardsToCheck.reduce(
              (params, item, i) => ({
                ...params,
                [`className${i}`]: item.className,
                [`semester${i}`]: item.semester,
                ...(item.academicYearId
                  ? { [`academicYearId${i}`]: item.academicYearId }
                  : {}),
              }),
              {},
            ),
          )
          .getMany();

        // Map existing standards for quick lookup
        existingStandards.forEach((standard) => {
          const key = `${standard.className}|${standard.semester}|${standard.academicYearId || 'null'}`;
          existingStandardsMap.set(key, standard);
        });
      }

      // Create standards (skip if exists)
      for (const { index, data, dto } of standardsToProcess) {
        try {
          // Check if already exists
          const existingKey = `${dto.className}|${dto.semester}|${dto.academicYearId || 'null'}`;
          if (existingStandardsMap.has(existingKey)) {
            results.skipped++;
            continue; // Skip this record
          }

          await this.createWithManager(dto, manager);
          results.success++;
        } catch (error: any) {
          // Check if it's a duplicate key error (backup check)
          if (
            error.code === '23505' ||
            error.message?.includes('duplicate') ||
            error.message?.includes('already exists')
          ) {
            results.skipped++;
          } else {
            results.errors.push({
              row: index + 1,
              data,
              error: error.message,
            });
          }
        }
      }
    });

    return results;
  }

  private parseSemesterString(semesterStr: string): KyHoc {
    const normalized = semesterStr.toLowerCase().trim();

    if (normalized.includes('1.1') || normalized.includes('học kỳ 1.1')) {
      return KyHoc.KI_1_1;
    } else if (
      normalized.includes('1.2') ||
      normalized.includes('học kỳ 1.2')
    ) {
      return KyHoc.KI_1_2;
    } else if (
      normalized.includes('2.1') ||
      normalized.includes('học kỳ 2.1')
    ) {
      return KyHoc.KI_2_1;
    } else if (
      normalized.includes('2.2') ||
      normalized.includes('học kỳ 2.2')
    ) {
      return KyHoc.KI_2_2;
    } else if (normalized.includes('kỳ 1') || normalized.includes('học kỳ 1')) {
      return KyHoc.KI_1_1;
    } else if (normalized.includes('kỳ 2') || normalized.includes('học kỳ 2')) {
      return KyHoc.KI_2_1;
    }

    // Default to KI_1_1 if cannot parse
    return KyHoc.KI_1_1;
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
}
