import { Expose } from 'class-transformer';
import { FileStatus } from '../../../common/enums/file-status.enum';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';
import { BucketType } from '../../../common/enums/bucket-type.enum';

export class FileResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  path: string;

  @Expose()
  storageKey: string;

  @Expose()
  isFolder: boolean;

  @Expose()
  size: string;

  @Expose()
  mimeType?: string | null;

  @Expose()
  status: FileStatus;

  @Expose()
  bucketType: BucketType;

  @Expose()
  visibility: FileVisibility;

  @Expose()
  ownerId: string;

  @Expose()
  parentId?: string | null;

  @Expose()
  metadata?: Record<string, unknown> | null;

  @Expose()
  approvedAt?: Date | null;

  @Expose()
  rejectedAt?: Date | null;

  @Expose()
  createdAt: Date;
}

