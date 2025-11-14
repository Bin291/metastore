import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { Invite } from '../../entities/invite.entity';
import { InviteStatus } from '../../common/enums/invite-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';

export interface CreateInviteInput {
  email?: string;
  role: UserRole;
  expiresAt?: Date;
  maxUses?: number;
  createdById: string;
}

export interface AcceptInviteInput {
  email: string;
  userFullName: string;
  userPhone: string;
}

export interface ApproveInviteInput {
  inviteId: string;
  userId: string;
  password?: string;
  username?: string;
}

export interface RejectInviteInput {
  inviteId: string;
  reason?: string;
}

export interface ListInvitesOptions {
  page?: number;
  limit?: number;
  status?: InviteStatus;
}

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createInvite(input: CreateInviteInput): Promise<Invite> {
    const invite = this.inviteRepository.create({
      email: input.email?.toLowerCase() || '',
      role: input.role,
      expiresAt: input.expiresAt,
      maxUses: input.maxUses ?? 1,
      createdById: input.createdById,
      token: randomUUID(),
      status: InviteStatus.PENDING,
      metadata: {},
      uses: 0,
    });

    const savedInvite = await this.inviteRepository.save(invite);

    await this.auditLogService.record({
      action: AuditAction.INVITE_CREATED,
      userId: input.createdById,
      actorType: AuditActorType.USER,
      resourceId: savedInvite.id,
      resourceType: 'invite',
      metadata: {
        email: savedInvite.email,
        role: savedInvite.role,
        expiresAt: savedInvite.expiresAt,
      },
    });

    return savedInvite;
  }

  async listInvites(
    options: ListInvitesOptions,
  ): Promise<[Invite[], number]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.inviteRepository.createQueryBuilder('invite');

    if (options.status) {
      qb.andWhere('invite.status = :status', { status: options.status });
    }

    qb.orderBy('invite.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async findByToken(token: string): Promise<Invite | null> {
    return this.inviteRepository.findOne({ where: { token } });
  }

  async validateInviteForConsumption(token: string): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite is not available');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('Invite has expired');
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      invite.status = InviteStatus.REVOKED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('Invite has already been used');
    }

    return invite;
  }

  async markInviteUsed(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    invite.uses += 1;
    invite.createdForUserId = userId;

    if (!invite.maxUses || invite.uses >= invite.maxUses) {
      invite.status = InviteStatus.USED;
      invite.acceptedAt = new Date();
    }

    await this.inviteRepository.save(invite);

    await this.auditLogService.record({
      action: AuditAction.INVITE_ACCEPTED,
      actorType: AuditActorType.USER,
      userId,
      resourceId: invite.id,
      resourceType: 'invite',
      metadata: {
        email: invite.email,
      },
    });
  }

  async acceptInvite(
    token: string,
    input: AcceptInviteInput,
  ): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite is not available');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepository.save(invite);
      throw new BadRequestException('Invite has expired');
    }

    // Update with user's registration info
    invite.userFullName = input.userFullName;
    invite.userPhone = input.userPhone;
    invite.invitationResponseDate = new Date();
    invite.invitationResponseStatus = 'pending';
    invite.email = input.email.toLowerCase();

    const savedInvite = await this.inviteRepository.save(invite);

    return savedInvite;
  }

  async approveInvite(input: ApproveInviteInput): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { id: input.inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitationResponseStatus !== 'pending') {
      throw new BadRequestException('Invite is not pending approval');
    }

    // Password hash will be done in controller to avoid circular dependency
    invite.invitationResponseStatus = 'approved';
    invite.status = InviteStatus.USED;
    invite.createdForUserId = input.userId;
    
    // Store password hash in metadata temporarily for controller to process
    if (input.password) {
      invite.metadata = invite.metadata || {};
      (invite.metadata as any).pendingPassword = input.password;
      (invite.metadata as any).pendingUsername = input.username;
    }

    return this.inviteRepository.save(invite);
  }

  async rejectInvite(input: RejectInviteInput): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { id: input.inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.invitationResponseStatus !== 'pending') {
      throw new BadRequestException('Invite is not pending approval');
    }

    invite.invitationResponseStatus = 'rejected';
    invite.rejectionReason = input.reason || null;
    invite.status = InviteStatus.REVOKED;

    return this.inviteRepository.save(invite);
  }

  async revokeInvite(inviteId: string): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    invite.status = InviteStatus.REVOKED;
    return this.inviteRepository.save(invite);
  }

  async saveInvite(invite: Invite): Promise<Invite> {
    return this.inviteRepository.save(invite);
  }
}

