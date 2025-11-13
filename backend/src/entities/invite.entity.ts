import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { InviteStatus } from '../common/enums/invite-status.enum';
import { User } from './user.entity';

@Entity({ name: 'invites' })
@Unique(['token'])
@Index('idx_invites_status', ['status'])
export class Invite extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  token: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    type: 'text',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'text',
    default: InviteStatus.PENDING,
  })
  status: InviteStatus;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses?: number | null;

  @Column({ name: 'uses', type: 'int', default: 0 })
  uses: number;

  @Column({ name: 'metadata', type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ManyToOne(() => User, (user) => user.invitesCreated, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'created_for_user_id', type: 'text', nullable: true })
  createdForUserId?: string | null;
}

