import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Invite } from '../../entities/invite.entity';
import { InviteStatus } from '../../common/enums/invite-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';

export interface CreateInviteInput {
  email: string;
  role: UserRole;
  expiresAt?: Date;
  maxUses?: number;
  createdById: string;
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
      email: input.email.toLowerCase(),
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
}

