import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { AuditActorType } from '../common/enums/audit-actor-type.enum';
import { User } from './user.entity';

@Entity({ name: 'audit_logs' })
@Index('idx_audit_logs_action', ['action'])
@Index('idx_audit_logs_created_at', ['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  action: string;

  @Column({
    name: 'actor_type',
    type: 'text',
    default: AuditActorType.USER,
  })
  actorType: AuditActorType;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId?: string | null;

  @Column({ name: 'resource_type', type: 'varchar', nullable: true })
  resourceType?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 48, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'metadata', type: 'text', nullable: true })
  metadata?: Record<string, unknown> | null;
}

