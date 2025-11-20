import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';

@Entity({ name: 'notifications' })
@Index('idx_notifications_user', ['userId'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User, (user) => user.notifications, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 128 })
  type: string;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ type: 'text', nullable: true, transformer: {
    to: (value: any) => value ? JSON.stringify(value) : null,
    from: (value: string) => {
      if (!value) return null;
      try { return JSON.parse(value); } catch { return value; }
    }
  }})
  payload?: Record<string, unknown> | null;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt?: Date | null;
}

