import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';
import { SubscriptionPlan } from '../common/enums/subscription-plan.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Entity({ name: 'subscriptions' })
@Index('idx_subscriptions_user', ['userId'])
@Index('idx_subscriptions_status', ['status'])
@Index('idx_subscriptions_created_at', ['createdAt'])
export class Subscription extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'plan',
    type: 'text',
  })
  plan: SubscriptionPlan;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'status',
    type: 'text',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId?: string | null;

  @Column({ name: 'payment_proof', type: 'text', nullable: true })
  paymentProof?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'approved_by_id', type: 'varchar', length: 36, nullable: true })
  approvedById?: string | null;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'metadata', type: 'text', nullable: true, transformer: {
    to: (value: any) => value ? JSON.stringify(value) : null,
    from: (value: string) => {
      if (!value) return null;
      try { return JSON.parse(value); } catch { return value; }
    }
  }})
  metadata?: Record<string, unknown> | null;
}

