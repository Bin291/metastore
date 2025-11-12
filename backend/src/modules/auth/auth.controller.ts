import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, user } = await this.authService.login(
      dto.username,
      dto.password,
    );

    this.setAuthCookies(res, tokens);
    return this.toUserResponse(user);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refreshTokens(
    @Req() req: Request & { user: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      req.user.sub,
      req.user.refreshToken,
    );

    this.setAuthCookies(res, tokens);

    const user = await this.usersService.findById(req.user.sub);
    return this.toUserResponse(user);
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    const user = await this.authService.acceptInvite({
      token: dto.token,
      username: dto.username,
      password: dto.password,
    });

    return this.toUserResponse(user);
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const cookieDomain =
      this.configService.get<string>('auth.cookieDomain') ?? undefined;
    const cookieSecure =
      this.configService.get<boolean>('auth.cookieSecure') ?? false;
    const sameSite =
      (this.configService.get<'lax' | 'strict' | 'none'>(
        'auth.cookieSameSite',
      ) ?? 'lax') as 'lax' | 'strict' | 'none';
    const accessCookieName =
      this.configService.get<string>('auth.accessTokenCookieName') ??
      'metastore_access_token';
    const refreshCookieName =
      this.configService.get<string>('auth.refreshTokenCookieName') ??
      'metastore_refresh_token';
    const accessTtl =
      this.configService.get<string>('auth.accessTokenTtl') ?? '15m';
    const refreshTtl =
      this.configService.get<string>('auth.refreshTokenTtl') ?? '7d';

    const accessMaxAge = this.parseDurationToMs(accessTtl, 15 * 60 * 1000);
    const refreshMaxAge = this.parseDurationToMs(
      refreshTtl,
      7 * 24 * 60 * 60 * 1000,
    );

    res.cookie(accessCookieName, tokens.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite,
      domain: cookieDomain,
      path: '/',
      maxAge: accessMaxAge,
    });

    res.cookie(refreshCookieName, tokens.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite,
      domain: cookieDomain,
      path: '/',
      maxAge: refreshMaxAge,
    });
  }

  private clearAuthCookies(res: Response) {
    const accessCookieName =
      this.configService.get<string>('auth.accessTokenCookieName') ??
      'metastore_access_token';
    const refreshCookieName =
      this.configService.get<string>('auth.refreshTokenCookieName') ??
      'metastore_refresh_token';
    const cookieDomain =
      this.configService.get<string>('auth.cookieDomain') ?? undefined;
    const cookieSecure =
      this.configService.get<boolean>('auth.cookieSecure') ?? false;
    const sameSite =
      (this.configService.get<'lax' | 'strict' | 'none'>(
        'auth.cookieSameSite',
      ) ?? 'lax') as 'lax' | 'strict' | 'none';

    const options = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite,
      domain: cookieDomain,
      path: '/',
    } as const;

    res.clearCookie(accessCookieName, options);
    res.clearCookie(refreshCookieName, options);
  }

  private toUserResponse(user: any) {
    if (!user) {
      return null;
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  private parseDurationToMs(value: string | undefined, defaultMs: number) {
    if (!value) {
      return defaultMs;
    }

    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) {
      return defaultMs;
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] ?? 1);
  }
}

