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
import { ShareLinksService } from './share-links.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareLinkResponseDto } from './dto/share-link-response.dto';
import { ListShareLinksQueryDto } from './dto/list-share-links-query.dto';
import { ToggleShareLinkDto } from './dto/toggle-share-link.dto';
import { AccessShareLinkDto } from './dto/access-share-link.dto';
import { FilesService } from '../files/files.service';

@Controller('share-links')
export class ShareLinksController {
  constructor(
    private readonly shareLinksService: ShareLinksService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async createShareLink(
    @Body() dto: CreateShareLinkDto,
    @CurrentUser('id') userId: string,
  ) {
    const link = await this.shareLinksService.createShareLink({
      resourceId: dto.resourceId,
      permission: dto.permission,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      password: dto.password,
      createdById: userId,
    });

    return this.toResponse(link);
  }

  @Get()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async listShareLinks(
    @CurrentUser() user: { id: string; role: UserRole },
    @Query() query: ListShareLinksQueryDto,
  ) {
    const [links, total] = await this.shareLinksService.listShareLinks(
      user,
      query,
    );

    return {
      data: links.map((link) => this.toResponse(link)),
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async toggleShareLink(
    @Param('id') linkId: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: ToggleShareLinkDto,
  ) {
    const link = await this.shareLinksService.toggleShareLink(
      linkId,
      user,
      dto.active,
    );
    return this.toResponse(link);
  }

  @Post('token/:token/access')
  async accessShareLink(
    @Param('token') token: string,
    @Body() dto: AccessShareLinkDto,
  ) {
    const link = await this.shareLinksService.verifyAndAccess(token, dto.password);

    return this.toResponse(link);
  }

  @Post('token/:token/download-url')
  async downloadSharedResource(
    @Param('token') token: string,
    @Body() dto: AccessShareLinkDto,
  ) {
    const link = await this.shareLinksService.verifyAndAccess(token, dto.password);
    const url = await this.filesService.getDownloadUrlForShare(link);
    return url;
  }

  private toResponse(link: any) {
    return plainToInstance(ShareLinkResponseDto, link, {
      excludeExtraneousValues: true,
    });
  }
}

