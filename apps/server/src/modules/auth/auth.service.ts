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
import { WechatCustomerService } from './wechat-customer.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type ResidentProfile = Pick<Resident, 'id' | 'openid' | 'nickname' | 'avatar' | 'phone'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly envConfigService: EnvConfigService,
    private readonly wechatCustomerService: WechatCustomerService,
  ) {}

  async wechatLogin(loginDto: WechatLoginDto): Promise<{
    tokens: TokenPair;
    resident: ResidentProfile;
  }> {
    const openid = await this.resolveOpenid(loginDto.code);

    let resident = await this.prismaService.resident.findUnique({
      where: { openid },
      select: { id: true, openid: true, nickname: true, avatar: true, phone: true },
    });

    if (!resident) {
      resident = await this.prismaService.resident.create({
        data: {
          openid,
          nickname: loginDto.nickname,
          avatar: loginDto.avatar,
        },
        select: { id: true, openid: true, nickname: true, avatar: true, phone: true },
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

    // 按 role 分流刷新，避免员工 refresh 被当成居民查库失败
    if (payload.role === AUTH_ROLE_WORKER) {
      const worker = await this.prismaService.worker.findUnique({
        where: { id: payload.sub },
        select: { id: true, phone: true },
      });
      if (!worker) {
        throw new UnauthorizedException('Worker does not exist');
      }
      const tokens = await this.issueWorkerTokens(worker.id, worker.phone);
      return { tokens };
    }

    if (payload.role === AUTH_ROLE_ADMIN) {
      const admin = await this.prismaService.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, status: true },
      });
      if (!admin || admin.status !== 'ENABLED') {
        throw new UnauthorizedException('Admin does not exist or disabled');
      }
      const tokens = await this.issueAdminTokens(admin.id, admin.email);
      return { tokens };
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

    if (worker.employmentStatus === 'RESIGNED') {
      throw new UnauthorizedException('账号已离职，无法登录');
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
    resident: ResidentProfile;
  }> {
    const resident = await this.prismaService.resident.findUnique({
      where: { id: user.residentId },
      select: { id: true, openid: true, nickname: true, avatar: true, phone: true },
    });

    if (!resident) {
      throw new UnauthorizedException('Resident does not exist');
    }

    return { resident };
  }

  /**
   * 解密 getPhoneNumber code 得到手机号，并写回当前居民
   * 已配置微信凭证时调用微信 getuserphonenumber；否则使用确定性 mock 号
   */
  async decryptPhone(code: string, user: CurrentUser): Promise<{ phone: string }> {
    const phone = this.wechatCustomerService.isConfigured
      ? (await this.wechatCustomerService.getPhoneNumber(code)).phone
      : this.getMockPhoneByCode(code);

    await this.prismaService.resident.update({
      where: { id: user.residentId },
      data: { phone },
    });

    return { phone };
  }

  private async resolveOpenid(code: string): Promise<string> {
    if (this.wechatCustomerService.isConfigured) {
      const { openid } = await this.wechatCustomerService.code2Session(code);
      return openid;
    }
    return this.getMockOpenidByCode(code);
  }

  private getMockPhoneByCode(code: string): string {
    const hash = createHash('sha256').update(code).digest('hex');
    const suffix = parseInt(hash.slice(0, 7), 16) % 100000000;
    return `138${String(suffix).padStart(8, '0')}`;
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
