import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuditableEntity } from 'src/database/base/auditable.entity';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';

@Injectable()
@EventSubscriber()
export class AuditableSubscriber
  implements EntitySubscriberInterface<AuditableEntity>
{
  private readonly logger = new Logger(AuditableSubscriber.name);

  constructor(
    private readonly cls: ClsService<MyClsStore>,
    private readonly dataSource: DataSource,
  ) {
    this.logger.log('AuditableSubscriber initialized');
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return AuditableEntity;
  }

  beforeInsert(event: InsertEvent<AuditableEntity>) {
    const auditContext = this.cls.get('auditContext');
    const userId = auditContext?.user?.id;
    if (userId) {
      event.entity.createdById = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<AuditableEntity>) {
    if (event.entity) {
      const auditContext = this.cls.get('auditContext');
      const userId = auditContext?.user?.id;
      if (userId) {
        event.entity.updatedById = userId;
      }
    }
  }
}
