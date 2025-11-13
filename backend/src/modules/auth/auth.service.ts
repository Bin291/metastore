import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActorType } from '../../common/enums/audit-actor-type.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { StringValue } from 'ms';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitesService: InvitesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ tokens: AuthTokens; user: User }> {
    const user = await this.validateUser(username, password);

    const tokens = await this.generateTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    await this.usersService.updateLastLogin(user.id);

    await this.auditLogService.record({
      action: AuditAction.USER_LOGIN,
      userId: user.id,
      actorType: AuditActorType.USER,
    });

    return { tokens, user };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findByRefreshToken(
      userId,
      refreshToken,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
    await this.auditLogService.record({
      action: AuditAction.USER_LOGOUT,
      userId,
      actorType: AuditActorType.USER,
    });
  }

  async acceptInvite(params: {
    token: string;
    username: string;
    password: string;
  }): Promise<User> {
    const invite =
      await this.invitesService.validateInviteForConsumption(params.token);

    const existingUser = await this.usersService.findByUsername(
      params.username,
    );
    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    const passwordHash = await argon2.hash(params.password);

    const user = await this.usersService.createUserFromInvite({
      invite,
      username: params.username,
      passwordHash,
      email: invite.email,
    });

    await this.invitesService.markInviteUsed(invite.id, user.id);

    return user;
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const refreshTokenSecret =
      this.configService.get<string>('auth.refreshTokenSecret') ??
      'change-me-refresh-secret';
    const refreshTokenTtl =
      (this.configService.get<string>('auth.refreshTokenTtl') ?? '7d') as StringValue;

    const refreshOptions: JwtSignOptions = {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenTtl,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, refreshOptions),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await argon2.hash(refreshToken);
    await this.usersService.setRefreshTokenHash(userId, hash);
  }
}

