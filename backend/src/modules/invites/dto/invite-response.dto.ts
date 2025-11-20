import { Expose } from 'class-transformer';
import { InviteStatus } from '../../../common/enums/invite-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';

export class InviteResponseDto {
  @Expose()
  id: string;

  @Expose()
  token: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole;

  @Expose()
  status: InviteStatus;

  @Expose()
  expiresAt?: Date | null;

  @Expose()
  maxUses?: number | null;

  @Expose()
  uses: number;

  @Expose()
  createdAt: Date;

  // User registration info
  @Expose()
  userFullName?: string | null;

  @Expose()
  userPhone?: string | null;

  @Expose()
  invitationResponseDate?: Date | null;

  @Expose()
  invitationResponseStatus?: 'pending' | 'approved' | 'rejected' | null;

  @Expose()
  rejectionReason?: string | null;

  // Temporary credentials for approved invites
  @Expose()
  metadata?: {
    temporaryUsername?: string;
    temporaryPassword?: string;
    [key: string]: any;
  } | null;
}

