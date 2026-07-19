import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Admin, Resident, Worker } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { EnvConfigService } from '../../common/config/env-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AUTH_ROLE_ADMIN, AUTH_ROLE_RESIDENT, AUTH_ROLE_WORKER } from './auth.constants';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WorkerLoginDto } from './dto/worker-login.dto';
import { CurrentUser } from './interfaces/current-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly envConfigService: EnvConfigService,
  ) {}

  async wechatLogin(loginDto: WechatLoginDto): Promise<{
    tokens: TokenPair;
    resident: Pick<Resident, 'id' | 'openid' | 'nickname' | 'avatar'>;
  }> {
    const openid = this.getMockOpenidByCode(loginDto.code);

    let resident = await this.prismaService.resident.findUnique({
      where: { openid },
      select: { id: true, openid: true, nickname: true, avatar: true },
    });

    if (!resident) {
      resident = await this.prismaService.resident.create({
        data: {
          openid,
          nickname: loginDto.nickname,
          avatar: loginDto.avatar,
        },
        select: { id: true, openid: true, nickname: true, avatar: true },
      });
    }

    const tokens = await this.issueTokens(resident.id, resident.openid);

    return { tokens, resident };
  }

  async refreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ tokens: TokenPair }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.envConfigService.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const resident = await this.prismaService.resident.findUnique({
      where: { id: payload.sub },
      select: { id: true, openid: true },
    });

    if (!resident) {
      throw new UnauthorizedException('Resident does not exist');
    }

    const tokens = await this.issueTokens(resident.id, resident.openid);
    return { tokens };
  }

  async workerLogin(loginDto: WorkerLoginDto): Promise<{
    tokens: TokenPair;
    worker: Pick<Worker, 'id' | 'phone' | 'name' | 'employeeNo'>;
  }> {
    const worker = await this.prismaService.worker.findUnique({
      where: { phone: loginDto.phone },
    });

    if (!worker) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, worker.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const tokens = await this.issueWorkerTokens(worker.id, worker.phone);

    return {
      tokens,
      worker: {
        id: worker.id,
        phone: worker.phone,
        name: worker.name,
        employeeNo: worker.employeeNo,
      },
    };
  }

  async adminLogin(loginDto: AdminLoginDto): Promise<{
    tokens: TokenPair;
    admin: Pick<Admin, 'id' | 'email' | 'name' | 'username' | 'isSuperAdmin'>;
  }> {
    const admin = await this.prismaService.admin.findUnique({
      where: { email: loginDto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (admin.status !== 'ENABLED') {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const tokens = await this.issueAdminTokens(admin.id, admin.email);

    return {
      tokens,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        username: admin.username,
        isSuperAdmin: admin.isSuperAdmin,
      },
    };
  }

  async getProfile(user: CurrentUser): Promise<{
    resident: Pick<Resident, 'id' | 'openid' | 'nickname' | 'avatar'>;
  }> {
    const resident = await this.prismaService.resident.findUnique({
      where: { id: user.residentId },
      select: { id: true, openid: true, nickname: true, avatar: true },
    });

    if (!resident) {
      throw new UnauthorizedException('Resident does not exist');
    }

    return { resident };
  }

  private async issueWorkerTokens(workerId: number, phone: string): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: workerId,
      phone,
      role: AUTH_ROLE_WORKER,
      tokenType: 'access',
    };
    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.envConfigService.jwtAccessSecret,
        expiresIn: this.envConfigService.jwtAccessExpiresIn as never,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.envConfigService.jwtRefreshSecret,
        expiresIn: this.envConfigService.jwtRefreshExpiresIn as never,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresInToSeconds(this.envConfigService.jwtAccessExpiresIn),
    };
  }

  private async issueAdminTokens(adminId: number, email: string): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: adminId,
      email,
      role: AUTH_ROLE_ADMIN,
      tokenType: 'access',
    };
    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.envConfigService.jwtAccessSecret,
        expiresIn: this.envConfigService.jwtAccessExpiresIn as never,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.envConfigService.jwtRefreshSecret,
        expiresIn: this.envConfigService.jwtRefreshExpiresIn as never,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresInToSeconds(this.envConfigService.jwtAccessExpiresIn),
    };
  }

  /**
   * Mock 手机号解密
   * 生产环境应调用微信 phonenumber.getPhoneNumber 接口解密 code
   * 此处根据 code hash 生成一个确定性的 mock 手机号，供开发阶段使用
   */
  async decryptPhone(code: string): Promise<{ phone: string }> {
    const hash = createHash('sha256').update(code).digest('hex');
    const suffix = parseInt(hash.slice(0, 7), 16) % 100000000;
    const phone = `138${String(suffix).padStart(8, '0')}`;
    return { phone };
  }

  private getMockOpenidByCode(code: string): string {
    const hash = createHash('sha256').update(code).digest('hex').slice(0, 24);
    return `${this.envConfigService.mockOpenidPrefix}${hash}`;
  }

  private async issueTokens(residentId: number, openid: string): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: residentId,
      openid,
      role: AUTH_ROLE_RESIDENT,
      tokenType: 'access',
    };
    const refreshPayload: JwtPayload = {
      ...accessPayload,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.envConfigService.jwtAccessSecret,
        expiresIn: this.envConfigService.jwtAccessExpiresIn as never,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.envConfigService.jwtRefreshSecret,
        expiresIn: this.envConfigService.jwtRefreshExpiresIn as never,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresInToSeconds(this.envConfigService.jwtAccessExpiresIn),
    };
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const matched = expiresIn.match(/^(\d+)([smhd])$/i);
    if (!matched) {
      const asNumber = Number(expiresIn);
      return Number.isFinite(asNumber) ? asNumber : 7200;
    }

    const value = Number(matched[1]);
    const unit = matched[2].toLowerCase();

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7200;
    }
  }
}
