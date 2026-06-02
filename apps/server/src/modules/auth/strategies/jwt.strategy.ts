import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvConfigService } from '@server/common/config/env-config.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AUTH_ROLE_RESIDENT } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(envConfigService: EnvConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfigService.jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<{
    residentId: number;
    openid: string;
    role: string;
  }> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.role !== AUTH_ROLE_RESIDENT) {
      throw new UnauthorizedException('Unsupported role');
    }

    return {
      residentId: payload.sub,
      openid: payload.openid,
      role: payload.role,
    };
  }
}
