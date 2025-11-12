import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { ShareLink, FileObject } from '../../entities';
import { SharePermission } from '../../common/enums/share-permission.enum';
import { ShareResourceType } from '../../common/enums/share-resource-type.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';

export interface CreateShareLinkInput {
  resourceId: string;
  permission: SharePermission;
  expiresAt?: Date;
  password?: string;
  createdById: string;
}

export interface ListShareLinksOptions {
  page?: number;
  limit?: number;
  ownerId?: string;
  active?: boolean;
}

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(FileObject)
    private readonly fileRepository: Repository<FileObject>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createShareLink(input: CreateShareLinkInput): Promise<ShareLink> {
    const file = await this.fileRepository.findOne({
      where: { id: input.resourceId },
    });

    if (!file) {
      throw new NotFoundException('Resource not found');
    }

    if (file.ownerId !== input.createdById) {
      throw new ForbiddenException('You do not own this file');
    }

    const shareLink = this.shareLinkRepository.create({
      resourceId: file.id,
      resourceType: file.isFolder
        ? ShareResourceType.FOLDER
        : ShareResourceType.FILE,
      permission: input.permission,
      expiresAt: input.expiresAt,
      passwordHash: input.password ? await argon2.hash(input.password) : null,
      token: randomUUID(),
      active: true,
      createdById: input.createdById,
      metadata: {},
    });

    const saved = await this.shareLinkRepository.save(shareLink);

    await this.auditLogService.record({
      action: AuditAction.SHARE_LINK_CREATED,
      userId: input.createdById,
      actorType: AuditActorType.USER,
      resourceId: saved.id,
      resourceType: 'share_link',
      metadata: {
        resourceId: file.id,
        permission: saved.permission,
      },
    });

    return saved;
  }

  async listShareLinks(
    user: { id: string; role: UserRole },
    options: ListShareLinksOptions,
  ): Promise<[ShareLink[], number]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.shareLinkRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.resource', 'resource');

    if (user.role !== UserRole.ADMIN) {
      qb.andWhere('link.createdById = :createdById', {
        createdById: user.id,
      });
    } else if (options.ownerId) {
      qb.andWhere('link.createdById = :createdById', {
        createdById: options.ownerId,
      });
    }

    if (options.active !== undefined) {
      qb.andWhere('link.active = :active', { active: options.active });
    }

    qb.orderBy('link.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async toggleShareLink(
    linkId: string,
    user: { id: string; role: UserRole },
    active: boolean,
  ): Promise<ShareLink> {
    const link = await this.shareLinkRepository.findOne({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (user.role !== UserRole.ADMIN && link.createdById !== user.id) {
      throw new ForbiddenException('You cannot modify this link');
    }

    link.active = active;
    const saved = await this.shareLinkRepository.save(link);

    await this.auditLogService.record({
      action: AuditAction.SHARE_LINK_TOGGLED,
      userId: user.id,
      actorType: AuditActorType.USER,
      resourceId: saved.id,
      resourceType: 'share_link',
      metadata: {
        active: saved.active,
      },
    });

    return saved;
  }

  async getShareLinkByToken(token: string): Promise<ShareLink> {
    const link = await this.shareLinkRepository.findOne({
      where: { token },
      relations: ['resource'],
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (!link.active) {
      throw new ForbiddenException('Link has been disabled');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new ForbiddenException('Link has expired');
    }

    return link;
  }

  async verifyPassword(link: ShareLink, password?: string): Promise<void> {
    if (!link.passwordHash) {
      return;
    }

    if (!password) {
      throw new ForbiddenException('Password required');
    }

    const valid = await argon2.verify(link.passwordHash, password);
    if (!valid) {
      throw new ForbiddenException('Invalid link password');
    }
  }

  async recordAccess(link: ShareLink): Promise<void> {
    link.accessCount += 1;
    link.lastAccessedAt = new Date();
    await this.shareLinkRepository.save(link);
  }
}

