import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuditContext } from 'src/modules/audit-log/subscribers/audit-log.subscriber';
import { MyClsStore } from '../interfaces/my-cls-store.interface';
import { IRequest } from '../types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly cls: ClsService<MyClsStore>) {}

  canActivate(context: ExecutionContext): boolean {
    const request: IRequest = context.switchToHttp().getRequest();

    const user = request.user || {
      id: null,
      username: null,
      fullName: null,
      roles: null,
    };

    const auditContext: AuditContext = {
      user: {
        id: user.id,
        username: user.username,
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
  }
}
