import {
  Column,
  Entity,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export enum OutboxEventStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity({ name: 'outbox_events' })
@Index('idx_outbox_events_status', ['status'])
@Index('idx_outbox_events_created_at', ['createdAt'])
export class OutboxEvent extends BaseEntity {
  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType: string;

  @Column({ type: 'text' })
  payload: string; // JSON string

  @Column({
    type: 'text',
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 255, nullable: true })
  traceId?: string | null;
}

