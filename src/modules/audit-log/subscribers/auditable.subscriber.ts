import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { MyClsStore } from 'src/shared/interfaces/my-cls-store.interface';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditableEntity } from '../../../database/base/auditable.entity';

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
    event.entity.createdById = this.cls.get('auditContext.userId') ?? null;
  }

  beforeUpdate(event: UpdateEvent<AuditableEntity>) {
    if (event.entity) {
      event.entity.updatedById = this.cls.get('auditContext.userId') ?? null;
    }
  }
}
