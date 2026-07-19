import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EnvConfigService } from '../../../common/config/env-config.service';
import { AUTH_ROLE_ADMIN } from '../auth.constants';
import { AdminCurrentUser } from '../interfaces/admin-current-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    envConfigService: EnvConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfigService.jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AdminCurrentUser> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.role !== AUTH_ROLE_ADMIN) {
      throw new UnauthorizedException('Unsupported role');
    }

    // 每次请求查库校验账号状态，确保禁用账号的旧 token 立即失效（不能只验签名）
    const admin = await this.prismaService.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || admin.status !== 'ENABLED') {
      throw new UnauthorizedException('账号已禁用或不存在');
    }

    return {
      adminId: admin.id,
      email: admin.email,
      isSuperAdmin: admin.isSuperAdmin,
      role: payload.role,
    };
  }
}
