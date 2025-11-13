import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { FileStatus } from '../common/enums/file-status.enum';
import { BucketType } from '../common/enums/bucket-type.enum';
import { FileVisibility } from '../common/enums/file-visibility.enum';
import { User } from './user.entity';
import { ShareLink } from './share-link.entity';
import { ModerationTask } from './moderation-task.entity';

@Entity({ name: 'files' })
@Index('idx_files_owner', ['ownerId'])
@Index('idx_files_status', ['status'])
@Index('idx_files_visibility', ['visibility'])
export class FileObject extends BaseEntity {
  @Column({ type: 'varchar', length: 512 })
  name: string;

  @Column({ type: 'varchar', length: 1024 })
  path: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ name: 'is_folder', type: 'boolean', default: false })
  isFolder: boolean;

  @Column({ type: 'bigint', default: 0 })
  size: string;

  @Column({ name: 'mime_type', type: 'text', nullable: true })
  mimeType?: string | null;

  @Column({ name: 'checksum', type: 'text', nullable: true })
  checksum?: string | null;

  @Column({
    type: 'text',
    default: FileStatus.PENDING,
  })
  status: FileStatus;

  @Column({
    name: 'bucket_type',
    type: 'text',
    default: BucketType.PENDING,
  })
  bucketType: BucketType;

  @Column({
    type: 'text',
    default: FileVisibility.PRIVATE,
  })
  visibility: FileVisibility;

  @ManyToOne(() => User, (user) => user.files, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => FileObject, (file) => file.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: FileObject | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @OneToMany(() => FileObject, (file) => file.parent)
  children: FileObject[];

  @OneToMany(() => ShareLink, (shareLink) => shareLink.resource)
  shareLinks: ShareLink[];

  @OneToMany(() => ModerationTask, (task) => task.file)
  moderationTasks: ModerationTask[];

  @Column({ name: 'metadata', type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt?: Date | null;

  @Column({
    name: 'public_path',
    type: 'text',
    nullable: true,
    comment: 'Publicly accessible path if visibility is public',
  })
  publicPath?: string | null;
}

