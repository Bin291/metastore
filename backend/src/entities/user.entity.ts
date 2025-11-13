import {
  Column,
  Entity,
  Index,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Invite } from './invite.entity';
import { ShareLink } from './share-link.entity';
import { FileObject } from './file-object.entity';
import { Notification } from './notification.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';

@Entity({ name: 'users' })
@Unique(['username'])
@Index('idx_users_role', ['role'])
export class User extends BaseEntity {
  @Column({ length: 64 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({
    type: 'text',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'text',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string | null;

  @Column({ name: 'bucket_prefix', length: 255 })
  bucketPrefix: string;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt?: Date | null;

  @Column({ name: 'profile_metadata', type: 'text', nullable: true, transformer: {
    to: (value: any) => value ? JSON.stringify(value) : null,
    from: (value: string) => {
      if (!value) return null;
      try { return JSON.parse(value); } catch { return value; }
    }
  }})
  profileMetadata?: Record<string, unknown> | null;

  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash?: string | null;

  @OneToMany(() => Invite, (invite) => invite.createdBy, {
    cascade: false,
  })
  invitesCreated: Invite[];

  @OneToMany(() => ShareLink, (shareLink) => shareLink.createdBy, {
    cascade: false,
  })
  shareLinks: ShareLink[];

  @OneToMany(() => FileObject, (file) => file.owner)
  files: FileObject[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

