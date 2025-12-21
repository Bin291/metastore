import { Expose, Type } from 'class-transformer';
import { SharePermission } from '../../../common/enums/share-permission.enum';
import { ShareResourceType } from '../../../common/enums/share-resource-type.enum';
import { FileVisibility } from '../../../common/enums/file-visibility.enum';

export class ShareLinkResourceDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  mimeType?: string | null;

  @Expose()
  isFolder: boolean;

  @Expose()
  size: string;

  @Expose()
  visibility: FileVisibility;
}

export class ShareLinkResponseDto {
  @Expose()
  id: string;

  @Expose()
  token: string;

  @Expose()
  resourceId: string;

  @Expose()
  resourceType: ShareResourceType;

  @Expose()
  permission: SharePermission;

  @Expose()
  active: boolean;

  @Expose()
  expiresAt?: Date | null;

  @Expose()
  lastAccessedAt?: Date | null;

  @Expose()
  accessCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => ShareLinkResourceDto)
  resource?: ShareLinkResourceDto;
}

