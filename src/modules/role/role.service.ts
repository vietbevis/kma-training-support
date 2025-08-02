import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FacultyDepartmentEntity } from 'src/database/entities/faculty-department.entity';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { RoleEntity } from 'src/database/entities/role.entity';
import { In, Like, Repository } from 'typeorm';
import { CreateRoleDto, GetRolesQueryDto, UpdateRoleDto } from './role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(FacultyDepartmentEntity)
    private readonly facultyDepartmentRepository: Repository<FacultyDepartmentEntity>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    // Kiểm tra tên role đã tồn tại
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Kiểm tra faculty department nếu có
    if (createRoleDto.scopeFacultyDepartmentId) {
      const facultyDepartment = await this.facultyDepartmentRepository.findOne({
        where: { id: createRoleDto.scopeFacultyDepartmentId },
      });

      if (!facultyDepartment) {
        throw new NotFoundException('Faculty department not found');
      }
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      description: createRoleDto.description || '',
      isActive:
        createRoleDto.isActive !== undefined ? createRoleDto.isActive : true,
      isSystemRole: false, // Mặc định không phải system role
      scopeFacultyDepartmentId: createRoleDto.scopeFacultyDepartmentId,
    });

    const savedRole = await this.roleRepository.save(role);

    // Gán permissions nếu có
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      await this.assignPermissions(savedRole.id, createRoleDto.permissionIds);
    }

    return await this.findOne(savedRole.id);
  }

  async findAll(queryDto: GetRolesQueryDto) {
    const { page = 1, limit = 10, search, isSystemRole, isActive } = queryDto;

    const [data, total] = await this.roleRepository.findAndCount({
      where: {
        name: search ? Like(`%${search}%`) : undefined,
        description: search ? Like(`%${search}%`) : undefined,
        isSystemRole: isSystemRole !== undefined ? isSystemRole : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
      relations: {
        scopeFacultyDepartment: true,
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
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        scopeFacultyDepartment: true,
        permissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Vai trò không tồn tại');
    }

    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    isAdmin: boolean = false,
  ) {
    const role = await this.findOne(id);

    if (role.isSystemRole && !isAdmin) {
      throw new ForbiddenException('Chỉ admin có thể sửa đổi vai trò hệ thống');
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        throw new BadRequestException('Tên vai trò đã tồn tại');
      }
    }

    if (updateRoleDto.scopeFacultyDepartmentId) {
      const facultyDepartment = await this.facultyDepartmentRepository.findOne({
        where: { id: updateRoleDto.scopeFacultyDepartmentId },
      });

      if (!facultyDepartment) {
        throw new NotFoundException('Khoa/phòng ban không tồn tại');
      }
    }

    Object.assign(role, {
      name: updateRoleDto.name || role.name,
      description:
        updateRoleDto.description !== undefined
          ? updateRoleDto.description
          : role.description,
      isActive:
        updateRoleDto.isActive !== undefined
          ? updateRoleDto.isActive
          : role.isActive,
      scopeFacultyDepartmentId:
        updateRoleDto.scopeFacultyDepartmentId || role.scopeFacultyDepartmentId,
    });

    const savedRole = await this.roleRepository.save(role);

    const permissionIdsSet = new Set(updateRoleDto.permissionIds);

    if (permissionIdsSet.size > 0) {
      await this.assignPermissions(savedRole.id, Array.from(permissionIdsSet));
    }

    return await this.findOne(savedRole.id);
  }

  async remove(id: string, isAdmin: boolean = false) {
    const role = await this.findOne(id);

    if (role.isSystemRole && !isAdmin) {
      throw new ForbiddenException('Chỉ admin có thể xóa vai trò hệ thống');
    }

    await this.roleRepository.remove(role);
    return { message: 'Vai trò đã được xóa thành công' };
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.findOne(roleId);
    const permissionIdsSet = new Set(permissionIds);
    const permissions = await this.permissionRepository.findBy({
      id: In(Array.from(permissionIdsSet)),
    });

    if (permissions.length !== permissionIdsSet.size) {
      throw new BadRequestException('Một số quyền hạn không tồn tại');
    }

    role.permissions = permissions;
    await this.roleRepository.save(role);

    return await this.findOne(roleId);
  }
}
