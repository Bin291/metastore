import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { ModerationStatus } from '../common/enums/moderation-status.enum';
import { FileObject } from './file-object.entity';

@Entity({ name: 'moderation_tasks' })
@Index('idx_moderation_tasks_status', ['status'])
export class ModerationTask extends BaseEntity {
  @ManyToOne(() => FileObject, (file) => file.moderationTasks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file: FileObject;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({
    type: 'text',
    default: ModerationStatus.PENDING,
  })
  status: ModerationStatus;

  @Column({ type: 'text', nullable: true })
  verdict?: string | null;

  @Column({ type: 'text', nullable: true })
  details?: Record<string, unknown> | null;

  @Column({ name: 'scored_at', type: 'datetime', nullable: true })
  scoredAt?: Date | null;

  @Column({
    name: 'score',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  score?: string | null;
}

