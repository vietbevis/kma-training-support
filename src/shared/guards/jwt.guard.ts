import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { VERSION_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { ClsService } from 'nestjs-cls';
import { PermissionEntity } from 'src/database/entities/permission.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { AuditContext } from 'src/modules/audit-log/subscribers/audit-log.subscriber';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MyClsStore } from '../interfaces/my-cls-store.interface';
import { ConfigService } from '../services/config.service';
import { IRequest } from '../types';
import { RsaKeyManager } from '../utils/RsaKeyManager';
import buildFullPath from '../utils/buildFullPath';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  constructor(
    private readonly keyManager: RsaKeyManager,
    private readonly reflector: Reflector,
    private readonly cls: ClsService<MyClsStore>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const apiPrefix = this.configService.get('API_PREFIX');
    const defaultApiVersion = this.configService.get('API_DEFAULT_VERSION');
    const apiVersion = this.reflector.getAllAndOverride<string>(
      VERSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục');
    }

    try {
      const payload = jwt.verify(token, this.keyManager.getPublicKeyAccess(), {
        algorithms: ['RS256'],
      }) as JwtPayload;

      const user = await this.dataSource.getRepository(UserEntity).findOne({
        where: { id: payload.sub },
        select: {
          id: true,
          fullName: true,
          username: true,
          roles: {
            id: true,
            name: true,
            isActive: true,
            isSystemRole: true,
            scopeFacultyDepartment: {
              id: true,
              name: true,
            },
          },
        },
        relations: {
          roles: {
            scopeFacultyDepartment: true,
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục');
      }

      // Kiểm tra user có quyền truy cập endpoint này không
      const permissionsSet = new Set<string>();
      const activeRoles = user.roles.filter((role) => role.isActive);
      for (const role of activeRoles) {
        const permissions = await this.dataSource
          .getRepository(PermissionEntity)
          .find({
            where: { roles: { id: role.id } },
            cache: {
              id: `role:${role.id}:permissions`,
              milliseconds: 3600000,
            },
          });
        permissions.forEach((permission) => {
          permissionsSet.add(`${permission.method}:${permission.path}`);
        });
      }

      const version = apiVersion || defaultApiVersion;
      const defaultPath = buildFullPath(apiPrefix, `v${String(version)}`);
      const pathSerialized = request.route.path.replace(defaultPath, '');

      const hasPermission = permissionsSet.has(
        `${request.method}:${pathSerialized}`,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện hành động này',
        );
      }

      // Gán thông tin user vào request
      request.user = {
        id: payload.sub,
        username: payload.username,
        fullName: user.fullName,
        roles: user.roles,
      };

      const auditContext: AuditContext = {
        user: {
          id: payload.sub,
          username: payload.username,
          fullName: user.fullName,
          roles: user.roles,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
        httpMethod: request.method,
        endpoint: request.route.path,
      };

      this.cls.set('auditContext', auditContext);

      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(
          'Token đã hết hạn, vui lòng đăng nhập lại',
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(
          'Token không hợp lệ, vui lòng đăng nhập lại',
        );
      } else if (error instanceof ForbiddenException) {
        throw error;
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        this.logger.error('JWT verification failed:', error);
        throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục');
      }
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
