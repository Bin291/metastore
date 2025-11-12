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
import { plainToInstance } from 'class-transformer';
import { InvitesService } from './invites.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ListInvitesQueryDto } from './dto/list-invites-query.dto';
import { InviteResponseDto } from './dto/invite-response.dto';

@Controller('invites')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

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

  private toResponse(invite: any) {
    if (!invite) {
      return null;
    }

    return plainToInstance(InviteResponseDto, invite, {
      excludeExtraneousValues: true,
    });
  }
}

