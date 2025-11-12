import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptions,
} from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.interface';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { Request } from 'express';

type CookieAwareRequest = Request & {
  cookies?: Record<string, string>;
};

function extractAccessTokenFromCookies(
  req: CookieAwareRequest,
  cookieName: string,
) {
  return cookieName ? req.cookies?.[cookieName] : undefined;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const cookieName =
      configService.get<string>('auth.accessTokenCookieName') ??
      'metastore_access_token';
    const secret =
      configService.get<string>('auth.accessTokenSecret') ??
      'change-me-access-secret';
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: CookieAwareRequest) =>
          extractAccessTokenFromCookies(req, cookieName),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    };
    super(options);
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}

