import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { SubjectEntity } from 'src/database/entities/subject.entity';
import { VisitingLecturerEntity } from 'src/database/entities/visiting-lecturer.entity';
import { ILike, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import {
  ApprovalActionDto,
  CreateVisitingLecturerDto,
  QueryVisitingLecturerDeletedDto,
  QueryVisitingLecturerDto,
  RejectionActionDto,
  UpdateVisitingLecturerDto,
} from './visiting-lecturer.dto';

@Injectable()
export class VisitingLecturerService {
  private readonly logger = new Logger(VisitingLecturerService.name);

  constructor(
    @InjectRepository(VisitingLecturerEntity)
    private readonly visitingLecturerRepository: Repository<VisitingLecturerEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
    @InjectRepository(AcademicCredentialsEntity)
    private readonly academicCredentialRepository: Repository<AcademicCredentialsEntity>,
    @InjectRepository(ExemptionPercentageEntity)
    private readonly exemptionPercentageRepository: Repository<ExemptionPercentageEntity>,
  ) {}

  async create(createVisitingLecturerDto: CreateVisitingLecturerDto) {
    try {
      // Kiểm tra facultyDepartmentId có tồn tại không (bắt buộc thuộc khoa không phải phòng ban)
      const facultyDepartment = await this.facultyDepartmentRepository.findOne({
        where: {
          id: createVisitingLecturerDto.facultyDepartmentId,
          isFaculty: true,
        },
      });

      if (!facultyDepartment) {
        throw new NotFoundException('Không tìm thấy khoa');
      }

      // Kiểm tra academicCredentialId có tồn tại không
      const academicCredential =
        await this.academicCredentialRepository.findOne({
          where: { id: createVisitingLecturerDto.academicCredentialId },
        });

      if (!academicCredential) {
        throw new NotFoundException('Không tìm thấy học hàm/học vị');
      }

      // Kiểm tra exemptionPercentageId có tồn tại không (nếu có)
      if (createVisitingLecturerDto.exemptionPercentageId) {
        const exemptionPercentage =
          await this.exemptionPercentageRepository.findOne({
            where: { id: createVisitingLecturerDto.exemptionPercentageId },
          });

        if (!exemptionPercentage) {
          throw new NotFoundException('Không tìm thấy phần trăm miễn giảm');
        }
      }

      // Kiểm tra subjectId có tồn tại và thuộc về khoa được chọn không
      const subject = await this.subjectRepository.findOne({
        where: {
          id: createVisitingLecturerDto.subjectId,
          facultyDepartmentId: createVisitingLecturerDto.facultyDepartmentId,
        },
      });

      if (!subject) {
        throw new BadRequestException(
          'Bộ môn không tồn tại hoặc không thuộc khoa được chọn',
        );
      }

      const visitingLecturer = this.visitingLecturerRepository.create(
        createVisitingLecturerDto,
      );

      const newVisitingLecturer =
        await this.visitingLecturerRepository.save(visitingLecturer);

      return newVisitingLecturer;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi tạo giảng viên mời', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException(
          'Giảng viên mời đã tồn tại (mã giảng viên mời đã được sử dụng)',
        );
      }
      throw new BadRequestException('Không thể tạo giảng viên mời');
    }
  }

  async findAll(queryDto: QueryVisitingLecturerDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        academicCredentialId,
        gender,
        areTeaching,
        trainingApproved,
        facultyApproved,
        academyApproved,
        includeDeleted = false,
      } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.visitingLecturerRepository.findAndCount({
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
          subjectId: subjectId || undefined,
          academicCredentialId: academicCredentialId || undefined,
          gender: gender || undefined,
          areTeaching: areTeaching !== undefined ? areTeaching : undefined,
          trainingApproved:
            trainingApproved !== undefined ? trainingApproved : undefined,
          facultyApproved:
            facultyApproved !== undefined ? facultyApproved : undefined,
          academyApproved:
            academyApproved !== undefined ? academyApproved : undefined,
          fullName: search ? ILike(`%${search}%`) : undefined,
        },
        skip,
        take: limit,
        order: {
          createdAt: 'DESC',
        },
        withDeleted: includeDeleted,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
        },
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
      this.logger.error('Lỗi lấy danh sách giảng viên mời', error);
      throw new BadRequestException('Không thể lấy danh sách giảng viên mời');
    }
  }

  async findOne(id: string, includeDeleted = false) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: {
          id,
        },
        withDeleted: includeDeleted,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
        },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      return visitingLecturer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi lấy thông tin giảng viên mời', error);
      throw new BadRequestException('Không thể lấy thông tin giảng viên mời');
    }
  }

  async update(
    id: string,
    updateVisitingLecturerDto: UpdateVisitingLecturerDto,
  ) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      const {
        facultyDepartmentId,
        subjectId,
        academicCredentialId,
        exemptionPercentageId,
        ...rest
      } = updateVisitingLecturerDto;

      /** =========================
       *  Kiểm tra facultyDepartmentId
       * ========================= */
      if (facultyDepartmentId) {
        const facultyDepartment =
          await this.facultyDepartmentRepository.findOne({
            where: { id: facultyDepartmentId },
            select: { id: true, isFaculty: true },
          });
        if (!facultyDepartment)
          throw new NotFoundException('Không tìm thấy phòng ban/khoa');

        visitingLecturer.facultyDepartmentId = facultyDepartment.id;

        if (!subjectId)
          throw new BadRequestException(
            'Giảng viên mời thuộc khoa phải chọn bộ môn',
          );

        const subject = await this.subjectRepository.findOne({
          where: { id: subjectId, facultyDepartmentId },
          select: { id: true },
        });
        if (!subject)
          throw new BadRequestException(
            'Bộ môn không tồn tại hoặc không thuộc khoa được chọn',
          );

        visitingLecturer.subjectId = subject.id;
      }

      /** =========================
       *  Kiểm tra academicCredentialId
       * ========================= */
      if (academicCredentialId) {
        const academicCredential =
          await this.academicCredentialRepository.findOne({
            where: { id: academicCredentialId },
            select: { id: true },
          });
        if (!academicCredential)
          throw new NotFoundException('Không tìm thấy học hàm/học vị');

        visitingLecturer.academicCredentialId = academicCredential.id;
      }

      /** =========================
       *  Kiểm tra exemptionPercentageId
       * ========================= */
      if (exemptionPercentageId) {
        const exemptionPercentage =
          await this.exemptionPercentageRepository.findOne({
            where: { id: exemptionPercentageId },
            select: { id: true },
          });
        if (!exemptionPercentage)
          throw new NotFoundException('Không tìm thấy phần trăm miễn giảm');

        visitingLecturer.exemptionPercentageId = exemptionPercentage.id;
      } else {
        visitingLecturer.exemptionPercentageId = null;
      }

      /** =========================
       *  Gán các field còn lại
       * ========================= */
      Object.assign(visitingLecturer, rest);

      return await this.visitingLecturerRepository.save(visitingLecturer);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;

      this.logger.error('Lỗi cập nhật giảng viên mời', error);
      if (error instanceof QueryFailedError) {
        throw new ConflictException(
          'Giảng viên mời đã tồn tại (mã giảng viên mời đã được sử dụng)',
        );
      }
      throw new BadRequestException('Không thể cập nhật giảng viên mời');
    }
  }

  async softRemove(id: string) {
    try {
      const visitingLecturer = await this.findOne(id);

      await this.visitingLecturerRepository.softRemove(visitingLecturer);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa mềm giảng viên mời', error);
      throw new BadRequestException('Không thể xóa mềm giảng viên mời');
    }
  }

  async hardRemove(id: string) {
    try {
      const visitingLecturer = await this.findOne(id, true);

      await this.visitingLecturerRepository.remove(visitingLecturer);

      return { id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi xóa vĩnh viễn giảng viên mời', error);
      throw new BadRequestException('Không thể xóa vĩnh viễn giảng viên mời');
    }
  }

  async restore(id: string) {
    this.logger.debug(`Khôi phục giảng viên mời ${id}`);
    try {
      const visitingLecturer = await this.findOne(id, true);

      await this.visitingLecturerRepository.restore(id);

      return visitingLecturer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khôi phục giảng viên mời', error);
      throw new BadRequestException('Không thể khôi phục giảng viên mời');
    }
  }

  async getDeletedRecords(queryDto: QueryVisitingLecturerDeletedDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        facultyDepartmentId,
        subjectId,
        academicCredentialId,
        gender,
        areTeaching,
        trainingApproved,
        facultyApproved,
        academyApproved,
      } = queryDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.visitingLecturerRepository.findAndCount({
        where: {
          facultyDepartmentId: facultyDepartmentId || undefined,
          subjectId: subjectId || undefined,
          academicCredentialId: academicCredentialId || undefined,
          gender: gender || undefined,
          areTeaching: areTeaching !== undefined ? areTeaching : undefined,
          trainingApproved:
            trainingApproved !== undefined ? trainingApproved : undefined,
          facultyApproved:
            facultyApproved !== undefined ? facultyApproved : undefined,
          academyApproved:
            academyApproved !== undefined ? academyApproved : undefined,
          deletedAt: Not(IsNull()),
          fullName: search ? ILike(`%${search}%`) : undefined,
        },
        skip,
        take: limit,
        order: {
          deletedAt: 'DESC',
        },
        withDeleted: true,
        relations: {
          facultyDepartment: true,
          subject: true,
          academicCredential: true,
          exemptionPercentage: true,
        },
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
      this.logger.error('Lỗi lấy danh sách giảng viên mời đã xóa', error);
      throw new BadRequestException(
        'Không thể lấy danh sách giảng viên mời đã xóa',
      );
    }
  }

  // === APPROVAL WORKFLOW METHODS ===

  async facultyApprove(id: string, approvalDto: ApprovalActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      // Khoa có thể duyệt bất cứ lúc nào
      visitingLecturer.facultyApproved = true;
      visitingLecturer.notes = '';

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Khoa đã duyệt giảng viên mời ${id}`);
      return { message: 'Khoa đã duyệt thành công', id };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Lỗi khi khoa duyệt giảng viên mời', error);
      throw new BadRequestException('Không thể thực hiện duyệt');
    }
  }

  async trainingApprove(id: string, approvalDto: ApprovalActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      // Chỉ được duyệt khi khoa đã duyệt
      if (!visitingLecturer.facultyApproved) {
        throw new BadRequestException(
          'Chỉ có thể duyệt khi khoa đã duyệt trước đó',
        );
      }

      visitingLecturer.trainingApproved = true;

      visitingLecturer.notes = '';

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Đào tạo đã duyệt giảng viên mời ${id}`);
      return { message: 'Đào tạo đã duyệt thành công', id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi khi đào tạo duyệt giảng viên mời', error);
      throw new BadRequestException('Không thể thực hiện duyệt');
    }
  }

  async trainingRejectFaculty(id: string, rejectionDto: RejectionActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      // Chỉ có thể bỏ duyệt khi Khoa đã được duyệt
      if (!visitingLecturer.facultyApproved) {
        throw new BadRequestException(
          'Không thể bỏ duyệt vì Khoa chưa được duyệt',
        );
      }

      // Đào tạo bỏ duyệt của Khoa
      visitingLecturer.facultyApproved = false;
      // Khi bỏ duyệt Khoa thì reset tất cả các cấp sau
      visitingLecturer.trainingApproved = false;

      // Update notes with rejection reason
      visitingLecturer.notes = rejectionDto.notes;

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Đào tạo đã bỏ duyệt Khoa cho giảng viên mời ${id}`);
      return { message: 'Đào tạo đã bỏ duyệt Khoa', id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi khi đào tạo bỏ duyệt Khoa', error);
      throw new BadRequestException('Không thể thực hiện bỏ duyệt');
    }
  }

  async academyApprove(id: string, approvalDto: ApprovalActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      // Chỉ được duyệt khi cả khoa và đào tạo đã duyệt
      if (!visitingLecturer.facultyApproved) {
        throw new BadRequestException(
          'Chỉ có thể duyệt khi khoa đã duyệt trước đó',
        );
      }
      if (!visitingLecturer.trainingApproved) {
        throw new BadRequestException(
          'Chỉ có thể duyệt khi đào tạo đã duyệt trước đó',
        );
      }

      visitingLecturer.academyApproved = true;

      visitingLecturer.notes = '';

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Học viện đã duyệt giảng viên mời ${id}`);
      return { message: 'Học viện đã duyệt thành công', id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi khi học viện duyệt giảng viên mời', error);
      throw new BadRequestException('Không thể thực hiện duyệt');
    }
  }

  async academyRejectTraining(id: string, rejectionDto: RejectionActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      // Chỉ có thể bỏ duyệt khi Đào tạo đã được duyệt
      if (!visitingLecturer.trainingApproved) {
        throw new BadRequestException(
          'Không thể bỏ duyệt vì Đào tạo chưa được duyệt',
        );
      }

      // Học viện bỏ duyệt của Đào tạo
      visitingLecturer.trainingApproved = false;
      // Khi bỏ duyệt Đào tạo thì cũng reset duyệt của Học viện
      visitingLecturer.academyApproved = false;

      // Update notes with rejection reason
      visitingLecturer.notes = rejectionDto.notes;

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Học viện đã bỏ duyệt Đào tạo cho giảng viên mời ${id}`);
      return { message: 'Học viện đã bỏ duyệt Đào tạo', id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi khi học viện bỏ duyệt Đào tạo', error);
      throw new BadRequestException('Không thể thực hiện bỏ duyệt');
    }
  }

  async academyRejectFaculty(id: string, rejectionDto: RejectionActionDto) {
    try {
      const visitingLecturer = await this.visitingLecturerRepository.findOne({
        where: { id },
      });

      if (!visitingLecturer) {
        throw new NotFoundException('Không tìm thấy giảng viên mời');
      }

      visitingLecturer.facultyApproved = false;
      visitingLecturer.trainingApproved = false;
      visitingLecturer.academyApproved = false;

      visitingLecturer.notes = rejectionDto.notes;

      await this.visitingLecturerRepository.save(visitingLecturer);

      this.logger.log(`Học viện đã bỏ duyệt Khoa cho giảng viên mời ${id}`);
      return { message: 'Học viện đã bỏ duyệt Khoa', id };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Lỗi khi học viện bỏ duyệt Khoa', error);
      throw new BadRequestException('Không thể thực hiện bỏ duyệt');
    }
  }
}
