import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { InvitesService } from './invites.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListInvitesQueryDto } from './dto/list-invites-query.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AdminApproveInviteDto, AdminRejectInviteDto } from './dto/admin-invite.dto';
import { User } from '../../entities/user.entity';
import { Invite } from '../../entities/invite.entity';
import { UserStatus } from '../../common/enums/user-status.enum';

@Controller('invites')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InvitesController {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Post()
  async createInvite(
    @Body() dto: CreateInviteDto,
    @CurrentUser('id') userId: string,
  ) {
    const invite = await this.invitesService.createInvite({
      email: dto.email,
      role: dto.role,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      maxUses: dto.maxUses,
      createdById: userId,
    });

    return this.toResponse(invite);
  }

  @Get()
  async listInvites(@Query() query: ListInvitesQueryDto) {
    const [invites, total] = await this.invitesService.listInvites(query);
    return {
      data: invites.map((invite) => this.toResponse(invite)),
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Patch(':id/revoke')
  async revokeInvite(@Param('id') inviteId: string) {
    const invite = await this.invitesService.revokeInvite(inviteId);
    return this.toResponse(invite);
  }

  @Post(':token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ) {
    const invite = await this.invitesService.acceptInvite(token, {
      email: dto.email,
      userFullName: dto.userFullName,
      userPhone: dto.userPhone,
    });
    return this.toResponse(invite);
  }

  @Get(':token')
  async getInvite(@Param('token') token: string) {
    const invite = await this.invitesService.findByToken(token);
    if (!invite) {
      throw new Error('Invite not found');
    }
    return this.toResponse(invite);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveInvite(
    @Param('id') inviteId: string,
    @Body() dto: AdminApproveInviteDto,
    @CurrentUser('id') userId: string,
  ) {
    const invite = await this.invitesService.approveInvite({
      inviteId,
      userId,
      password: dto.password,
      username: dto.username,
    });

    // Generate password if not provided
    const password = dto.password || this.generatePassword();
    const username = invite.userFullName || `user_${Date.now()}`;

    // Create user account
    let newUser: User | null = null;
    try {
      const passwordHash = await argon2.hash(password);
      newUser = this.usersRepository.create({
        email: invite.email,
        username: username,
        passwordHash,
        fullName: invite.userFullName,
        phone: invite.userPhone,
        role: invite.role,
        status: UserStatus.ACTIVE,
        bucketPrefix: `user-${Date.now()}`,
      });
      await this.usersRepository.save(newUser);

      // Store plain password & username temporarily for response
      invite.metadata = invite.metadata || {};
      (invite.metadata as any).temporaryPassword = password;
      (invite.metadata as any).temporaryUsername = username;
      
      await this.invitesService.saveInvite(invite);
    } catch (error) {
      console.error('Error creating user from invite:', error);
      throw new Error(`Failed to create user account: ${error.message}`);
    }

    // Create notification for the newly created user if approval message provided
    if (newUser && dto.message) {
      try {
        await this.notificationsService.createAndDispatch({
          userId: newUser.id,
          type: 'invite.approved',
          message: dto.message,
          payload: {
            inviteId: invite.id,
            username: username,
          },
        });
      } catch (error) {
        console.error('Error creating notification:', error);
        // Don't fail the whole operation if notification fails
      }
    }

    return this.toResponse(invite);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectInvite(
    @Param('id') inviteId: string,
    @Body() dto: AdminRejectInviteDto,
  ) {
    const invite = await this.invitesService.rejectInvite({
      inviteId,
      reason: dto.reason,
    });
    return this.toResponse(invite);
  }

  private toResponse(invite: any) {
    if (!invite) {
      return null;
    }

    return plainToInstance(InviteResponseDto, invite, {
      excludeExtraneousValues: true,
    });
  }

  private generatePassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

