import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProfileExtendedDto } from './dto/update-profile-extended.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UploadAvatarDto } from './dto/upload-avatar.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { StorageService } from '../storage/storage.service';
import { BucketType } from '../../common/enums/bucket-type.enum';
import * as argon2 from 'argon2';

@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Post('invite')
  @Roles(UserRole.ADMIN)
  async inviteUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    // Hash password
    const passwordHash = await argon2.hash(dto.password);
    // Tạo user mới
    const user = await this.usersService.createUser({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: dto.role,
      phone: dto.phone,
      createdBy: adminId,
    });
    return this.toResponse(user);
  }
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getCurrentUser(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.toResponse(user);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateCurrentUser(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileExtendedDto,
  ) {
    const user = await this.usersService.updateUserProfile(userId, dto);
    return this.toResponse(user);
  }

  @Post('me/change-password')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, message: 'Mật khẩu đã được thay đổi thành công' };
  }

  @Post('me/avatar/upload-url')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAvatarUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadAvatarDto,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate unique key for avatar
    const timestamp = Date.now();
    // Get extension from filename, default to jpg if not found
    let extension = dto.fileName.split('.').pop()?.toLowerCase() || 'jpg';
    // Normalize extension for common image types
    if (extension === 'jpeg') extension = 'jpg';
    const key = `${user.bucketPrefix}/avatar/${timestamp}.${extension}`;

    // Get presigned upload URL
    const presignedUrl = await this.storageService.getPresignedUploadUrl({
      bucketType: BucketType.PRIVATE,
      key,
      contentType: dto.contentType,
      expiresIn: 3600, // 1 hour
    });

    return {
      uploadUrl: presignedUrl.url,
      key,
      expiresIn: presignedUrl.expiresIn,
    };
  }

  @Get('me/avatar/url')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAvatarUrl(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const avatarKey = user.profileMetadata?.avatarUrl as string | undefined;
    if (!avatarKey) {
      return { url: null };
    }

    // If avatarKey is already a full URL, return it
    if (avatarKey.startsWith('http://') || avatarKey.startsWith('https://')) {
      return { url: avatarKey };
    }

    // If it's a storage key, get presigned download URL
    try {
      const downloadUrl = await this.storageService.getPresignedDownloadUrl({
        bucketType: BucketType.PRIVATE,
        key: avatarKey,
        expiresIn: 3600, // 1 hour
      });

      return { url: downloadUrl.url };
    } catch (error) {
      // If file doesn't exist in storage, return null
      return { url: null };
    }
  }

  @Get('me/avatar')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAvatar(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const avatarKey = user.profileMetadata?.avatarUrl as string | undefined;
    if (!avatarKey) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    // If avatarKey is already a full URL, redirect to it
    if (avatarKey.startsWith('http://') || avatarKey.startsWith('https://')) {
      return res.redirect(avatarKey);
    }

    // If it's a storage key, stream the file from storage
    try {
      const { stream, contentType } = await this.storageService.downloadFile({
        bucketType: BucketType.PRIVATE,
        key: avatarKey,
      });

      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      stream.pipe(res);
    } catch (error) {
      return res.status(404).json({ message: 'Avatar not found' });
    }
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async listUsers(@Query() query: ListUsersQueryDto) {
    const [users, total] = await this.usersService.listUsers(query);
    const data = users.map((user) => this.toResponse(user));

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const user = await this.usersService.updateUserRole(userId, dto.role);
    return this.toResponse(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateUserStatus(userId, dto.status);
    return this.toResponse(user);
  }

  private toResponse(user: any) {
    if (!user) {
      return null;
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}

