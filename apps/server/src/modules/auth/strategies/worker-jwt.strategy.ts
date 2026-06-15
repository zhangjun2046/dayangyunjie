import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvConfigService } from '../../../common/config/env-config.service';
import { AUTH_ROLE_WORKER } from '../auth.constants';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { WorkerCurrentUser } from '../interfaces/worker-current-user.interface';

@Injectable()
export class WorkerJwtStrategy extends PassportStrategy(Strategy, 'worker-jwt') {
  constructor(envConfigService: EnvConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfigService.jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<WorkerCurrentUser> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.role !== AUTH_ROLE_WORKER) {
      throw new UnauthorizedException('Unsupported role');
    }

    return {
      workerId: payload.sub,
      phone: payload.phone ?? '',
      role: payload.role,
    };
  }
}
