import { ClsStore } from 'nestjs-cls';
import { AuditContext } from 'src/modules/audit-log/subscribers/audit-log.subscriber';

export interface MyClsStore extends ClsStore {
  auditContext: AuditContext;
}
