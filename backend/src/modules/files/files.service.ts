import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type DeepPartial } from 'typeorm';
import { FileObject, ModerationTask, ShareLink } from '../../entities';
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
import { MediaProcessingService } from '../media/media-processing.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

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
    private readonly mediaProcessingService: MediaProcessingService,
  ) {}

  async requestUpload(
    userId: string,
    dto: RequestUploadDto,
    userRole: UserRole,
  ): Promise<PresignedUrlResult | null> {
    if (dto.isFolder) {
      return null;
    }

    // All uploads go directly to their target bucket (no pending)
    const visibility = dto.visibility ?? FileVisibility.PRIVATE;
    const bucketType = visibility === FileVisibility.PUBLIC ? BucketType.PUBLIC : BucketType.PRIVATE;

    const key = this.storageService.buildObjectKey(
      userId,
      dto.path,
      bucketType,
    );

    return this.storageService.getPresignedUploadUrl({
      bucketType,
      key,
      contentType: dto.mimeType,
    });
  }

  async registerFile(
    userId: string,
    dto: RegisterFileDto,
    userRole: UserRole,
  ): Promise<FileObject> {
    const visibility = dto.visibility ?? FileVisibility.PRIVATE;
    
    // All files are auto-approved now (no moderation workflow)
    const status = FileStatus.APPROVED;
    const bucketType = visibility === FileVisibility.PUBLIC ? BucketType.PUBLIC : BucketType.PRIVATE;
    const approvedAt = new Date();

    const storageKey = this.storageService.buildObjectKey(
      userId,
      dto.path,
      bucketType,
    );

    const filePayload: DeepPartial<FileObject> = {
      name: dto.name,
      path: dto.path,
      storageKey,
      isFolder: dto.isFolder,
      size: String(dto.size ?? 0),
      mimeType: dto.mimeType,
      checksum: dto.checksum,
      status,
      bucketType,
      visibility,
      ownerId: userId,
      parentId: dto.parentId ?? null,
      metadata: {},
      approvedAt,
    };

    const file = this.fileRepository.create(filePayload);
    const saved = await this.fileRepository.save(file);

    // Skip old moderation task creation
    if (false && !dto.isFolder && visibility === FileVisibility.PUBLIC && userRole !== UserRole.ADMIN) {
      const moderationTask = this.moderationRepository.create({
        fileId: saved.id,
      } as DeepPartial<ModerationTask>);
      await this.moderationRepository.save(moderationTask);
    }

    await this.auditLogService.record({
      action: AuditAction.FILE_UPLOADED,
      userId,
      actorType: AuditActorType.USER,
      resourceId: saved.id,
      resourceType: 'file',
      metadata: {
        name: saved.name,
        size: saved.size,
        visibility,
        status,
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

    // Users can see:
    // 1. Their own files (private + public)
    // 2. Other users' public files
    if (user.role === UserRole.ADMIN && query.ownerId) {
      // Admin with ownerId filter: see that user's files
      qb.andWhere('file.ownerId = :ownerId', { ownerId: query.ownerId });
    } else if (user.role === UserRole.USER) {
      // Regular users: their own files OR public files from others
      qb.andWhere(
        '(file.ownerId = :userId OR (file.visibility = :publicVisibility AND file.status = :approvedStatus))',
        { 
          userId: user.id,
          publicVisibility: FileVisibility.PUBLIC,
          approvedStatus: FileStatus.APPROVED
        }
      );
    } else {
      // Admin without filter: see all files (own + public from others)
      qb.andWhere(
        '(file.ownerId = :userId OR (file.visibility = :publicVisibility AND file.status = :approvedStatus))',
        { 
          userId: user.id,
          publicVisibility: FileVisibility.PUBLIC,
          approvedStatus: FileStatus.APPROVED
        }
      );
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
      message: `Your file "${updated.name}" has been approved.`,
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
      message: `Your file "${updated.name}" has been rejected${dto.reason ? ': ' + dto.reason : ''}.`,
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

  async getDownloadUrlForShare(link: ShareLink): Promise<PresignedUrlResult> {
    const resource =
      link.resource ??
      (await this.fileRepository.findOne({ where: { id: link.resourceId } }));

    if (!resource) {
      throw new NotFoundException('File not found');
    }

    if (resource.isFolder) {
      throw new BadRequestException('Cannot download a folder');
    }

    return this.storageService.getPresignedDownloadUrl({
      bucketType: resource.bucketType,
      key: resource.storageKey,
    });
  }

  async downloadFile(
    fileId: string,
    user: { id: string; role: UserRole } | null,
  ): Promise<{ file: FileObject; stream: any; contentType?: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (!this.canAccessFile(file, user)) {
      throw new ForbiddenException('Access denied');
    }

    if (file.isFolder) {
      throw new ForbiddenException('Cannot download a folder');
    }

    const { stream, contentType } = await this.storageService.downloadFile({
      bucketType: file.bucketType,
      key: file.storageKey,
    });

    await this.auditLogService.record({
      action: AuditAction.FILE_DOWNLOADED,
      userId: user?.id ?? 'anonymous',
      actorType: AuditActorType.USER,
      resourceId: file.id,
      resourceType: 'file',
      metadata: {
        name: file.name,
      },
    });

    return { file, stream, contentType: contentType ?? file.mimeType ?? undefined };
  }

  /**
   * Stream HLS playlist or segment files
   */
  async streamHLS(
    fileId: string,
    hlsPath: string,
    user: { id: string; role: UserRole },
  ): Promise<{ stream: any; contentType: string }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (!this.canAccessFile(file, user)) {
      throw new ForbiddenException('Access denied');
    }

    // Check if file has HLS metadata
    const hlsMetadata = (file.metadata as any)?.hls;
    if (!hlsMetadata || !hlsMetadata.processed) {
      throw new NotFoundException('HLS version not available');
    }

    // Build key for HLS file
    const key = `${file.ownerId}/${fileId}/hls/${hlsPath}`;

    const { stream, contentType } = await this.storageService.downloadFile({
      bucketType: file.bucketType,
      key,
    });

    // Determine content type based on file extension
    let finalContentType = contentType;
    if (hlsPath.endsWith('.m3u8')) {
      finalContentType = 'application/vnd.apple.mpegurl';
    } else if (hlsPath.endsWith('.ts')) {
      finalContentType = 'video/MP2T';
    }

    return { stream, contentType: finalContentType || 'application/octet-stream' };
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

  /**
   * Process uploaded video file into HLS format
   */
  private async processVideoFile(
    fileId: string,
    userId: string,
  ): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) return;

    const tempDir = path.join(os.tmpdir(), 'metastore-hls', fileId);

    try {
      // Download original file from MinIO
      const { stream } = await this.storageService.downloadFile({
        bucketType: file.bucketType,
        key: file.storageKey,
      });

      // Create temp directory for processing
      await mkdir(tempDir, { recursive: true });
      
      const inputPath = path.join(tempDir, 'original.mp4');
      const outputDir = path.join(tempDir, 'hls');

      // Save stream to temp file
      const writeStream = fs.createWriteStream(inputPath);
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      // Process video to HLS
      const result = await this.mediaProcessingService.processVideo(
        inputPath,
        outputDir,
        file.name,
      );

      console.log(`Video processed - Duration: ${result.duration}s, Qualities: ${result.qualities.length}`);

      // Upload HLS files back to MinIO
      await this.uploadHLSFiles(file, userId, outputDir, result);

      // Update file metadata with HLS info
      await this.fileRepository.update(file.id, {
        duration: result.duration,
        metadata: {
          ...file.metadata,
          hls: {
            masterPlaylist: result.masterPlaylistPath,
            qualities: result.qualities,
            duration: result.duration,
            processed: true,
          },
        },
      });

      console.log(`Video processing completed for file ${fileId}`);
    } catch (error) {
      console.error(`Video processing failed for file ${fileId}:`, error);
      // Update metadata to mark processing as failed
      await this.fileRepository.update(fileId, {
        metadata: {
          ...file.metadata,
          hls: {
            processed: false,
            error: error.message,
          },
        },
      });
    } finally {
      // Cleanup temp files after upload completes or fails
      try {
        await this.mediaProcessingService.cleanupMedia(tempDir);
      } catch (cleanupError) {
        console.error(`Failed to cleanup temp directory ${tempDir}:`, cleanupError);
      }
    }
  }

  /**
   * Process uploaded audio file into HLS format
   */
  private async processAudioFile(
    fileId: string,
    userId: string,
  ): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) return;

    const tempDir = path.join(os.tmpdir(), 'metastore-hls', fileId);

    try {
      // Download original file from MinIO
      const { stream } = await this.storageService.downloadFile({
        bucketType: file.bucketType,
        key: file.storageKey,
      });

      // Create temp directory for processing
      await mkdir(tempDir, { recursive: true });
      
      const inputPath = path.join(tempDir, 'original.mp3');
      const outputDir = path.join(tempDir, 'hls');

      // Save stream to temp file
      const writeStream = fs.createWriteStream(inputPath);
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      // Process audio to HLS
      const result = await this.mediaProcessingService.processAudio(
        inputPath,
        outputDir,
        file.name,
      );

      console.log(`Audio processed - Duration: ${result.duration}s`);

      // Upload HLS files back to MinIO
      await this.uploadHLSFiles(file, userId, outputDir, result);

      // Update file metadata with HLS info
      await this.fileRepository.update(file.id, {
        duration: result.duration,
        metadata: {
          ...file.metadata,
          hls: {
            masterPlaylist: result.masterPlaylistPath,
            duration: result.duration,
            processed: true,
          },
        },
      });

      console.log(`Audio processing completed for file ${fileId}`);
    } catch (error) {
      console.error(`Audio processing failed for file ${fileId}:`, error);
      await this.fileRepository.update(fileId, {
        metadata: {
          ...file.metadata,
          hls: {
            processed: false,
            error: error.message,
          },
        },
      });
    } finally {
      // Cleanup temp files after upload completes or fails
      try {
        await this.mediaProcessingService.cleanupMedia(tempDir);
      } catch (cleanupError) {
        console.error(`Failed to cleanup temp directory ${tempDir}:`, cleanupError);
      }
    }
  }

  /**
   * Upload HLS files to MinIO
   */
  private async uploadHLSFiles(
    file: FileObject,
    userId: string,
    hlsDir: string,
    result: any,
  ): Promise<void> {
    const uploadFile = async (localPath: string, remotePath: string) => {
      // Check if file exists before reading
      if (!fs.existsSync(localPath)) {
        console.warn(`Skipping non-existent file: ${localPath}`);
        return;
      }

      const content = await readFile(localPath);
      const key = `${userId}/${file.id}/hls/${remotePath}`;
      
      await this.storageService.uploadFile({
        bucketType: file.bucketType,
        key,
        content,
        contentType: remotePath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      });
    };

    // Upload all files recursively
    const uploadDir = async (dir: string, prefix = '') => {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const remotePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          await uploadDir(fullPath, remotePath);
        } else {
          await uploadFile(fullPath, remotePath);
        }
      }
    };

    await uploadDir(hlsDir);
  }

  /**
   * Initiate chunked upload for large files
   */
  async initiateChunkedUpload(
    userId: string,
    dto: InitiateUploadDto,
  ): Promise<{ fileId: string; uploadId: string; uploadUrls: string[] }> {
    const visibility = dto.visibility ?? FileVisibility.PRIVATE;
    const bucketType = visibility === FileVisibility.PUBLIC ? BucketType.PUBLIC : BucketType.PRIVATE;

    // Create file record first with UPLOADING status
    const storageKey = this.storageService.buildObjectKey(
      userId,
      dto.path || dto.fileName,
      bucketType,
    );

    const filePayload: DeepPartial<FileObject> = {
      name: dto.fileName,
      path: dto.path || dto.fileName,
      storageKey,
      isFolder: false,
      size: String(dto.fileSize),
      mimeType: dto.mimeType,
      checksum: dto.checksum,
      status: FileStatus.PENDING, // Mark as pending until upload completes
      bucketType,
      visibility,
      ownerId: userId,
      parentId: dto.parentId ?? null,
      metadata: {
        uploading: true,
        uploadStartedAt: new Date().toISOString(),
      },
    };

    const file = this.fileRepository.create(filePayload);
    const savedFile = await this.fileRepository.save(file);

    // Initiate multipart upload with MinIO
    const uploadId = await this.storageService.initiateMultipartUpload({
      bucketType,
      key: storageKey,
      contentType: dto.mimeType,
    });

    // Calculate number of parts (5MB chunks recommended for MinIO)
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const totalParts = Math.ceil(dto.fileSize / CHUNK_SIZE);

    // Generate presigned URLs for each part (up to 100 parts at a time to avoid timeout)
    const maxPartsToGenerate = Math.min(totalParts, 100);
    const uploadUrls: string[] = [];

    for (let i = 1; i <= maxPartsToGenerate; i++) {
      const url = await this.storageService.getPresignedUploadPartUrl({
        bucketType,
        key: storageKey,
        uploadId,
        partNumber: i,
        expiresIn: 3600, // 1 hour
      });
      uploadUrls.push(url);
    }

    // Store upload metadata
    await this.fileRepository.update(savedFile.id, {
      metadata: {
        ...savedFile.metadata,
        uploadId,
        totalParts,
        uploadedParts: [],
      },
    });

    return {
      fileId: savedFile.id,
      uploadId,
      uploadUrls,
    };
  }

  /**
   * Get additional upload part URLs if needed
   */
  async getUploadPartUrls(
    fileId: string,
    userId: string,
    startPart: number,
    endPart: number,
  ): Promise<string[]> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    
    if (!file || file.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const uploadId = (file.metadata as any)?.uploadId;
    if (!uploadId) {
      throw new BadRequestException('No active upload found');
    }

    const uploadUrls: string[] = [];
    for (let i = startPart; i <= endPart; i++) {
      const url = await this.storageService.getPresignedUploadPartUrl({
        bucketType: file.bucketType,
        key: file.storageKey,
        uploadId,
        partNumber: i,
        expiresIn: 3600,
      });
      uploadUrls.push(url);
    }

    return uploadUrls;
  }

  /**
   * Complete chunked upload
   */
  async completeChunkedUpload(
    userId: string,
    dto: CompleteUploadDto,
  ): Promise<FileObject> {
    const file = await this.fileRepository.findOne({ where: { id: dto.fileId } });
    
    if (!file || file.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const uploadId = (file.metadata as any)?.uploadId;
    if (!uploadId || uploadId !== dto.uploadId) {
      throw new BadRequestException('Invalid upload ID');
    }

    // Complete multipart upload
    await this.storageService.completeMultipartUpload({
      bucketType: file.bucketType,
      key: file.storageKey,
      uploadId: dto.uploadId,
      parts: dto.parts.map(p => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    });

    let updatedFile = await this.fileRepository.save({
      ...file,
      status: FileStatus.APPROVED, // Auto-approve
      approvedAt: new Date(),
      metadata: {
        ...file.metadata,
        uploading: false,
        uploadCompletedAt: new Date().toISOString(),
        uploadId: undefined,
        processing: false,
        processingStartedAt: undefined,
      },
    });

    // Reload file with updated metadata
    const reloadedFile = await this.fileRepository.findOne({ where: { id: updatedFile.id } });
    
    await this.auditLogService.record({
      action: AuditAction.FILE_UPLOADED,
      userId,
      actorType: AuditActorType.USER,
      resourceId: reloadedFile?.id || updatedFile.id,
      resourceType: 'file',
      metadata: {
        name: reloadedFile?.name || updatedFile.name,
        size: reloadedFile?.size || updatedFile.size,
        chunked: true,
      },
    });

    return reloadedFile || updatedFile;
  }

  /**
   * Abort chunked upload
   */
  async abortChunkedUpload(
    fileId: string,
    userId: string,
  ): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    
    if (!file || file.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const uploadId = (file.metadata as any)?.uploadId;
    if (uploadId) {
      await this.storageService.abortMultipartUpload({
        bucketType: file.bucketType,
        key: file.storageKey,
        uploadId,
      });
    }

    // Delete file record
    await this.fileRepository.delete(fileId);
  }
}

