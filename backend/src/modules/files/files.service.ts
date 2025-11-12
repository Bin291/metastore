import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type DeepPartial } from 'typeorm';
import { FileObject, ModerationTask } from '../../entities';
import { StorageService } from '../storage/storage.service';
import { BucketType } from '../../common/enums/bucket-type.enum';
import { RequestUploadDto } from './dto/request-upload.dto';
import { RegisterFileDto } from './dto/register-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileStatus } from '../../common/enums/file-status.enum';
import { FileVisibility } from '../../common/enums/file-visibility.enum';
import { FileQueryDto } from './dto/file-query.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApproveFileDto } from './dto/approve-file.dto';
import { RejectFileDto } from './dto/reject-file.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { PresignedUrlResult } from '../storage/storage.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileObject)
    private readonly fileRepository: Repository<FileObject>,
    @InjectRepository(ModerationTask)
    private readonly moderationRepository: Repository<ModerationTask>,
    private readonly storageService: StorageService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async requestUpload(
    userId: string,
    dto: RequestUploadDto,
  ): Promise<PresignedUrlResult | null> {
    if (dto.isFolder) {
      return null;
    }

    const key = this.storageService.buildObjectKey(
      userId,
      dto.path,
      BucketType.PENDING,
    );

    return this.storageService.getPresignedUploadUrl({
      bucketType: BucketType.PENDING,
      key,
      contentType: dto.mimeType,
    });
  }

  async registerFile(
    userId: string,
    dto: RegisterFileDto,
  ): Promise<FileObject> {
    const storageKey = this.storageService.buildObjectKey(
      userId,
      dto.path,
      BucketType.PENDING,
    );

    const filePayload: DeepPartial<FileObject> = {
      name: dto.name,
      path: dto.path,
      storageKey,
      isFolder: dto.isFolder,
      size: String(dto.size ?? 0),
      mimeType: dto.mimeType,
      checksum: dto.checksum,
      status: FileStatus.PENDING,
      bucketType: BucketType.PENDING,
      visibility: dto.visibility ?? FileVisibility.PRIVATE,
      ownerId: userId,
      parentId: dto.parentId ?? null,
      metadata: {},
    };

    const file = this.fileRepository.create(filePayload);

    const saved = await this.fileRepository.save(file);

    const moderationTask = this.moderationRepository.create({
      fileId: saved.id,
    } as DeepPartial<ModerationTask>);
    await this.moderationRepository.save(moderationTask);

    await this.auditLogService.record({
      action: AuditAction.FILE_UPDATED,
      userId,
      actorType: AuditActorType.USER,
      resourceId: saved.id,
      resourceType: 'file',
      metadata: {
        name: saved.name,
        size: saved.size,
      },
    });

    return saved;
  }

  async listFiles(
    user: { id: string; role: UserRole },
    query: FileQueryDto,
  ): Promise<[FileObject[], number]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.fileRepository.createQueryBuilder('file');

    if (user.role !== UserRole.ADMIN) {
      qb.andWhere('file.ownerId = :ownerId', { ownerId: user.id });
    } else if (query.ownerId) {
      qb.andWhere('file.ownerId = :ownerId', { ownerId: query.ownerId });
    }

    if (query.status) {
      qb.andWhere('file.status = :status', { status: query.status });
    }

    if (query.visibility) {
      qb.andWhere('file.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    if (query.parentId !== undefined) {
      qb.andWhere('file.parentId = :parentId', {
        parentId: query.parentId ?? null,
      });
    }

    if (query.search) {
      qb.andWhere('LOWER(file.name) LIKE :search', {
        search: `%${query.search.toLowerCase()}%`,
      });
    }

    qb.orderBy('file.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async updateFile(
    fileId: string,
    user: { id: string; role: UserRole },
    dto: UpdateFileDto,
  ): Promise<FileObject> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this file');
    }

    if (dto.name) {
      file.name = dto.name;
    }

    if (dto.visibility) {
      file.visibility = dto.visibility;
    }

    if (dto.metadata !== undefined) {
      file.metadata = dto.metadata;
    }

    if (dto.parentId !== undefined) {
      file.parentId = dto.parentId;
    }

    const updated = await this.fileRepository.save(file);

    await this.auditLogService.record({
      action: AuditAction.FILE_UPLOADED,
      userId: user.id,
      actorType: AuditActorType.USER,
      resourceId: updated.id,
      resourceType: 'file',
      metadata: {
        updatedFields: Object.keys(dto),
      },
    });

    return updated;
  }

  async approveFile(
    fileId: string,
    adminUserId: string,
    dto: ApproveFileDto,
  ): Promise<FileObject> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.status !== FileStatus.PENDING) {
      throw new ForbiddenException('File is not pending approval');
    }

    const visibility = dto.visibility ?? FileVisibility.PRIVATE;
    const targetBucket =
      visibility === FileVisibility.PUBLIC
        ? BucketType.PUBLIC
        : BucketType.PRIVATE;

    const destinationPath = dto.destinationPath ?? file.path;
    const destinationKey = this.storageService.buildObjectKey(
      file.ownerId,
      destinationPath,
      targetBucket,
    );

    if (!file.isFolder) {
      await this.storageService.moveObject(
        file.bucketType,
        file.storageKey,
        targetBucket,
        destinationKey,
      );
    }

    file.bucketType = targetBucket;
    file.visibility = visibility;
    file.path = destinationPath;
    file.storageKey = destinationKey;
    file.status = FileStatus.APPROVED;
    file.approvedAt = new Date();
    file.rejectedAt = null;

    const updated = await this.fileRepository.save(file);

    await this.auditLogService.record({
      action: AuditAction.FILE_APPROVED,
      userId: adminUserId,
      actorType: AuditActorType.USER,
      resourceId: updated.id,
      resourceType: 'file',
      metadata: {
        visibility: updated.visibility,
      },
    });

    await this.notificationsService.createAndDispatch({
      userId: file.ownerId,
      type: 'file.approved',
      payload: {
        fileId: updated.id,
        name: updated.name,
      },
    });

    return updated;
  }

  async rejectFile(
    fileId: string,
    adminUserId: string,
    dto: RejectFileDto,
  ): Promise<FileObject> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.status !== FileStatus.PENDING) {
      throw new ForbiddenException('File is not pending approval');
    }

    if (!file.isFolder) {
      const destinationKey = this.storageService.buildObjectKey(
        file.ownerId,
        file.path,
        BucketType.REJECTED,
      );
      await this.storageService.moveObject(
        file.bucketType,
        file.storageKey,
        BucketType.REJECTED,
        destinationKey,
      );
      file.storageKey = destinationKey;
    }

    file.bucketType = BucketType.REJECTED;
    file.status = FileStatus.REJECTED;
    file.rejectedAt = new Date();

    const updated = await this.fileRepository.save(file);

    await this.auditLogService.record({
      action: AuditAction.FILE_REJECTED,
      userId: adminUserId,
      actorType: AuditActorType.USER,
      resourceId: updated.id,
      resourceType: 'file',
      metadata: {
        reason: dto.reason,
      },
    });

    await this.notificationsService.createAndDispatch({
      userId: file.ownerId,
      type: 'file.rejected',
      payload: {
        fileId: updated.id,
        name: updated.name,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async deleteFile(
    fileId: string,
    user: { id: string; role: UserRole },
  ): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this file');
    }

    if (!file.isFolder) {
      await this.storageService.deleteObject(file.bucketType, file.storageKey);
    }

    await this.fileRepository.delete(fileId);

    await this.auditLogService.record({
      action: AuditAction.FILE_DELETED,
      userId: user.id,
      actorType: AuditActorType.USER,
      resourceId: fileId,
      resourceType: 'file',
    });
  }

  async getDownloadUrl(
    fileId: string,
    user: { id: string; role: UserRole } | null,
  ): Promise<PresignedUrlResult> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (!this.canAccessFile(file, user)) {
      throw new ForbiddenException('Access denied');
    }

    return this.storageService.getPresignedDownloadUrl({
      bucketType: file.bucketType,
      key: file.storageKey,
    });
  }

  private canAccessFile(
    file: FileObject,
    user: { id: string; role: UserRole } | null,
  ) {
    if (file.visibility === FileVisibility.PUBLIC) {
      return true;
    }

    if (!user) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    return file.ownerId === user.id;
  }
}

