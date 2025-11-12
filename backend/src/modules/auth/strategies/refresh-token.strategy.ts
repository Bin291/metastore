import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptionsWithRequest,
} from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.interface';
import type { Request } from 'express';

type CookieAwareRequest = Request & {
  cookies?: Record<string, string>
};

function extractRefreshToken(req: CookieAwareRequest, cookieName: string) {
  return cookieName ? req.cookies?.[cookieName] : undefined;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    const cookieName =
      configService.get<string>('auth.refreshTokenCookieName') ??
      'metastore_refresh_token';
    const secret =
      configService.get<string>('auth.refreshTokenSecret') ??
      'change-me-refresh-secret';
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: CookieAwareRequest) => extractRefreshToken(req, cookieName),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: CookieAwareRequest, payload: JwtPayload) {
    const cookieName =
      this.configService.get<string>('auth.refreshTokenCookieName') ??
      'metastore_refresh_token';
    const refreshToken =
      extractRefreshToken(req, cookieName) ??
      ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}

