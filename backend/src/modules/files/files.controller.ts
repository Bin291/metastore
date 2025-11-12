import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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

@Controller('files')
@UseGuards(JwtAccessGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async requestUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestUploadDto,
  ) {
    const presigned = await this.filesService.requestUpload(userId, dto);
    return presigned;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  async registerFile(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFileDto,
  ) {
    const file = await this.filesService.registerFile(userId, dto);
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

  private toResponse(file: any) {
    return plainToInstance(FileResponseDto, file, {
      excludeExtraneousValues: true,
    });
  }
}

