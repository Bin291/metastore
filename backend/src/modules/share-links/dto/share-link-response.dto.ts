import { Expose } from 'class-transformer';
import { SharePermission } from '../../../common/enums/share-permission.enum';
import { ShareResourceType } from '../../../common/enums/share-resource-type.enum';

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
}

