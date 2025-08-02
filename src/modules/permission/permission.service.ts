import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { Like, Repository } from 'typeorm';
import { GetPermissionsQueryDto, UpdatePermissionDto } from './permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async findAll(queryDto: GetPermissionsQueryDto) {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.permissionRepository.findAndCount({
      where: {
        name: search ? Like(`%${search}%`) : undefined,
        description: search ? Like(`%${search}%`) : undefined,
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Quyền hạn không tồn tại');
    }

    return permission;
  }

  async findByRoleId(roleId: string) {
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .innerJoin('permission.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .orderBy('permission.module', 'ASC')
      .addOrderBy('permission.path', 'ASC')
      .getMany();

    return permissions;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.findOne(id);

    permission.name = updatePermissionDto.name;
    if (updatePermissionDto.description !== undefined) {
      permission.description = updatePermissionDto.description;
    }

    return await this.permissionRepository.save(permission);
  }
}
