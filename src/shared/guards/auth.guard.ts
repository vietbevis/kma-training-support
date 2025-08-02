import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuditContext } from 'src/modules/audit-log/subscribers/audit-log.subscriber';
import { MyClsStore } from '../interfaces/my-cls-store.interface';
import { IRequest } from '../types';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly cls: ClsService<MyClsStore>) {}

  canActivate(context: ExecutionContext): boolean {
    const request: IRequest = context.switchToHttp().getRequest();

    const user = request.user || { id: null, email: null, role: null };

    const auditContext: AuditContext = {
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      httpMethod: request.method,
      endpoint: request.url,
    };

    this.cls.set('auditContext', auditContext);

    return true;
  }
}
