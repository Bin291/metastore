import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { SharePermission } from '../common/enums/share-permission.enum';
import { ShareResourceType } from '../common/enums/share-resource-type.enum';
import { FileObject } from './file-object.entity';
import { User } from './user.entity';

@Entity({ name: 'share_links' })
@Index('idx_share_links_token', ['token'], { unique: true })
@Index('idx_share_links_resource', ['resourceId'])
export class ShareLink extends BaseEntity {
  @Column({ length: 128 })
  token: string;

  @ManyToOne(() => FileObject, (file) => file.shareLinks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: FileObject;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({
    name: 'resource_type',
    type: 'enum',
    enum: ShareResourceType,
  })
  resourceType: ShareResourceType;

  @Column({
    type: 'enum',
    enum: SharePermission,
    default: SharePermission.VIEW,
  })
  permission: SharePermission;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: true })
  lastAccessedAt?: Date | null;

  @Column({ name: 'access_count', type: 'int', default: 0 })
  accessCount: number;

  @ManyToOne(() => User, (user) => user.shareLinks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById?: string | null;

  @Column({ name: 'metadata', type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;
}

