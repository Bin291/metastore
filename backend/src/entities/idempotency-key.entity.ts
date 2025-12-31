import {
  Column,
  Entity,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity({ name: 'idempotency_keys' })
@Unique(['key'])
@Index('idx_idempotency_keys_key', ['key'])
export class IdempotencyKey extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 255 })
  requestHash: string; // Hash of request body + headers

  @Column({ name: 'response_status', type: 'int' })
  responseStatus: number;

  @Column({ name: 'response_body', type: 'text' })
  responseBody: string; // JSON string

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;
}

