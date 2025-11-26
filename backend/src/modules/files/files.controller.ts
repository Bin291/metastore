import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FilesService } from './files.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUploadDto } from './dto/request-upload.dto';
import { RegisterFileDto } from './dto/register-file.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApproveFileDto } from './dto/approve-file.dto';
import { RejectFileDto } from './dto/reject-file.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';

@Controller('files')
@UseGuards(JwtAccessGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async requestUploadUrl(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: RequestUploadDto,
  ) {
    const presigned = await this.filesService.requestUpload(user.id, dto, user.role);
    return presigned;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  async registerFile(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: RegisterFileDto,
  ) {
    const file = await this.filesService.registerFile(user.id, dto, user.role);
    return this.toResponse(file);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  async listFiles(
    @CurrentUser() user: { id: string; role: UserRole },
    @Query() query: FileQueryDto,
  ) {
    const [files, total] = await this.filesService.listFiles(user, query);
    return {
      data: files.map((file) => this.toResponse(file)),
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateFile(
    @Param('id') fileId: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: UpdateFileDto,
  ) {
    const file = await this.filesService.updateFile(fileId, user, dto);
    return this.toResponse(file);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  async approveFile(
    @Param('id') fileId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveFileDto,
  ) {
    const file = await this.filesService.approveFile(fileId, adminId, dto);
    return this.toResponse(file);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  async rejectFile(
    @Param('id') fileId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectFileDto,
  ) {
    const file = await this.filesService.rejectFile(fileId, adminId, dto);
    return this.toResponse(file);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async deleteFile(
    @Param('id') fileId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    await this.filesService.deleteFile(fileId, user);
    return { success: true };
  }

  @Get(':id/download-url')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async downloadUrl(
    @Param('id') fileId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const url = await this.filesService.getDownloadUrl(fileId, user);
    return url;
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async downloadFile(
    @Param('id') fileId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<StreamableFile> {
    const { file, stream, contentType } = await this.filesService.downloadFile(fileId, user);
    
    // Block downloading raw video/audio files - must use HLS instead
    if (file.mimeType?.startsWith('video/') || file.mimeType?.startsWith('audio/')) {
      throw new BadRequestException(
        'Cannot download raw media files. Please use HLS streaming or wait for processing to complete.'
      );
    }
    
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
    });
  }

  @Get(':id/hls/*path')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Range')
  @Header('Accept-Ranges', 'bytes')
  @Header('Cache-Control', 'public, max-age=31536000, immutable') // Cache segments 1 năm
  async streamHLS(
    @Param('id') fileId: string,
    @Param('path') hlsPath: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<StreamableFile> {
    const { stream, contentType } = await this.filesService.streamHLS(fileId, hlsPath, user);
    
    return new StreamableFile(stream, {
      type: contentType,
    });
  }

  // ============ CHUNKED UPLOAD ENDPOINTS ============
  
  @Post('chunked-upload/initiate')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async initiateChunkedUpload(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateUploadDto,
  ) {
    return this.filesService.initiateChunkedUpload(userId, dto);
  }

  @Get('chunked-upload/:fileId/parts')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getUploadPartUrls(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startPart = parseInt(start, 10);
    const endPart = parseInt(end, 10);
    const urls = await this.filesService.getUploadPartUrls(fileId, userId, startPart, endPart);
    return { urls };
  }

  @Post('chunked-upload/complete')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async completeChunkedUpload(
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    const file = await this.filesService.completeChunkedUpload(userId, dto);
    return this.toResponse(file);
  }

  @Delete('chunked-upload/:fileId/abort')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async abortChunkedUpload(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.filesService.abortChunkedUpload(fileId, userId);
    return { success: true };
  }

  private toResponse(file: any) {
    return plainToInstance(FileResponseDto, file, {
      excludeExtraneousValues: true,
    });
  }
}

