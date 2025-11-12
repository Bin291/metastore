import { Expose } from 'class-transformer';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  role: UserRole;

  @Expose()
  status: UserStatus;

  @Expose()
  email?: string | null;

  @Expose()
  bucketPrefix: string;

  @Expose()
  profileMetadata?: Record<string, unknown> | null;

  @Expose()
  lastLoginAt?: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

