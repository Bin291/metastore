import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';

export interface AuditLogRecordInput {
  action: AuditAction | string;
  userId?: string;
  actorType?: AuditActorType;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async record(input: AuditLogRecordInput): Promise<AuditLog> {
    const record = this.auditLogRepository.create({
      action: input.action,
      actorType: input.actorType ?? AuditActorType.USER,
      userId: input.userId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      ipAddress: input.ipAddress,
      metadata: input.metadata,
    });

    return this.auditLogRepository.save(record);
  }
}

