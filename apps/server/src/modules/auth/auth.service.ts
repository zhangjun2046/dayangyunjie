import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { WechatWorkerService } from './wechat-worker.service';
import { WechatOaService } from '../wechat-oa/wechat-oa.service';

export type WorkerWechatBindStatus = {
  bound: boolean;
  oaPaired: boolean;
  subscribed: boolean | null;
};

export type ResidentWechatBindStatus = WorkerWechatBindStatus;

export type AdminWechatBindStatus = {
  bound: boolean;
  oaPaired: boolean;
  subscribed: boolean | null;
};

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

type ResidentProfile = Pick<Resident, 'id' | 'openid' | 'nickname' | 'avatar' | 'phone'> & {
  hasUnionid: boolean;
};

const RESIDENT_PROFILE_SELECT = {
  id: true,
  openid: true,
  nickname: true,
  avatar: true,
  phone: true,
  unionid: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly envConfigService: EnvConfigService,
    private readonly wechatCustomerService: WechatCustomerService,
    private readonly wechatWorkerService: WechatWorkerService,
    private readonly wechatOaService: WechatOaService,
  ) {}

  async wechatLogin(loginDto: WechatLoginDto): Promise<{
    tokens: TokenPair;
    resident: ResidentProfile;
  }> {
    const { openid, unionid } = await this.resolveWechatSession(loginDto.code);

    let resident = await this.prismaService.resident.findUnique({
      where: { openid },
      select: RESIDENT_PROFILE_SELECT,
    });

    if (!resident) {
      resident = await this.prismaService.resident.create({
        data: {
          openid,
          nickname: loginDto.nickname,
          avatar: loginDto.avatar,
        },
        select: RESIDENT_PROFILE_SELECT,
      });
    }

    if (unionid) {
      await this.persistResidentUnionidOnLogin(resident.id, unionid);
      const latest = await this.prismaService.resident.findUnique({
        where: { id: resident.id },
        select: { unionid: true },
      });
      resident = { ...resident, unionid: latest?.unionid ?? null };
    }

    const tokens = await this.issueTokens(resident.id, resident.openid);

    return { tokens, resident: this.toResidentProfile(resident) };
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

  async getWorkerWechatBindStatus(workerId: number): Promise<WorkerWechatBindStatus> {
    const worker = await this.prismaService.worker.findUnique({
      where: { id: workerId },
      select: { id: true, unionid: true },
    });
    if (!worker) {
      throw new NotFoundException('员工不存在');
    }

    let follower = await this.prismaService.wechatOaFollower.findFirst({
      where: { workerId },
    });
    if (!follower && worker.unionid) {
      follower = await this.prismaService.wechatOaFollower.findFirst({
        where: { unionid: worker.unionid },
      });
    }

    const oaPaired = follower?.workerId === workerId;
    return {
      bound: Boolean(worker.unionid),
      oaPaired,
      subscribed: follower ? follower.subscribed : null,
    };
  }

  async bindWorkerWechat(workerId: number, jsCode: string): Promise<WorkerWechatBindStatus> {
    const { openid, unionid } = await this.wechatWorkerService.code2Session(jsCode);

    const worker = await this.prismaService.worker.findUnique({
      where: { id: workerId },
      select: { id: true, unionid: true },
    });
    if (!worker) {
      throw new NotFoundException('员工不存在');
    }
    if (worker.unionid && worker.unionid !== unionid) {
      throw new ConflictException('请先解绑原微信后再绑定');
    }

    const unionidOwner = await this.prismaService.worker.findUnique({
      where: { unionid },
      select: { id: true },
    });
    if (unionidOwner && unionidOwner.id !== workerId) {
      throw new ConflictException('该微信已绑定其他员工账号');
    }

    const follower = await this.prismaService.wechatOaFollower.findFirst({
      where: { unionid },
    });
    if (follower?.workerId && follower.workerId !== workerId) {
      throw new ConflictException('该微信已绑定其他员工账号');
    }

    const otherFollower = await this.prismaService.wechatOaFollower.findFirst({
      where: follower
        ? { workerId, NOT: { id: follower.id } }
        : { workerId },
    });
    if (otherFollower) {
      throw new ConflictException('请先解绑原微信后再绑定');
    }

    await this.prismaService.worker.update({
      where: { id: workerId },
      data: { unionid, mpOpenid: openid },
    });

    if (follower && !follower.workerId) {
      await this.prismaService.wechatOaFollower.update({
        where: { id: follower.id },
        data: { workerId },
      });
    }

    return this.getWorkerWechatBindStatus(workerId);
  }

  async getResidentWechatBindStatus(residentId: number): Promise<ResidentWechatBindStatus> {
    const resident = await this.prismaService.resident.findUnique({
      where: { id: residentId },
      select: { id: true, unionid: true },
    });
    if (!resident) {
      throw new NotFoundException('居民不存在');
    }

    let follower = await this.prismaService.wechatOaFollower.findFirst({
      where: { residentId },
    });
    if (!follower && resident.unionid) {
      follower = await this.prismaService.wechatOaFollower.findFirst({
        where: { unionid: resident.unionid },
      });
    }

    return {
      bound: Boolean(resident.unionid),
      oaPaired: follower?.residentId === residentId,
      subscribed: follower ? follower.subscribed : null,
    };
  }

  /**
   * 存量居民冷启动补绑：只写 unionid 并尝试配对粉丝表，不换 token。
   */
  async bindResidentWechat(residentId: number, jsCode: string): Promise<ResidentWechatBindStatus> {
    if (!this.wechatCustomerService.isConfigured) {
      throw new BadRequestException('微信小程序凭证未配置');
    }

    const session = await this.wechatCustomerService.code2Session(jsCode);
    if (!session.unionid) {
      throw new BadRequestException('未获取到 unionid，请检查开放平台是否绑定居民端小程序与服务号');
    }

    await this.applyResidentUnionidPairing(residentId, session.unionid, { strict: true });
    return this.getResidentWechatBindStatus(residentId);
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

  async getAdminWechatBindStatus(adminId: number): Promise<AdminWechatBindStatus> {
    const admin = await this.prismaService.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }

    const follower = await this.prismaService.wechatOaFollower.findUnique({
      where: { adminId },
    });
    const bound = follower?.adminId === adminId;
    return {
      bound,
      oaPaired: bound,
      subscribed: follower ? follower.subscribed : null,
    };
  }

  async createAdminWechatOauthUrl(adminId: number): Promise<{ url: string }> {
    const url = await this.wechatOaService.createAdminAuthorizeUrl(adminId);
    return { url };
  }

  async unbindAdminWechat(adminId: number): Promise<AdminWechatBindStatus> {
    await this.wechatOaService.unbindAdminOpenid(adminId);
    return this.getAdminWechatBindStatus(adminId);
  }

  async getProfile(user: CurrentUser): Promise<{
    resident: ResidentProfile;
  }> {
    const resident = await this.prismaService.resident.findUnique({
      where: { id: user.residentId },
      select: RESIDENT_PROFILE_SELECT,
    });

    if (!resident) {
      throw new UnauthorizedException('Resident does not exist');
    }

    return { resident: this.toResidentProfile(resident) };
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

  private async resolveWechatSession(code: string): Promise<{ openid: string; unionid?: string }> {
    if (this.wechatCustomerService.isConfigured) {
      return this.wechatCustomerService.code2Session(code);
    }
    return { openid: this.getMockOpenidByCode(code) };
  }

  private toResidentProfile(row: {
    id: number;
    openid: string;
    nickname: string | null;
    avatar: string | null;
    phone: string | null;
    unionid?: string | null;
  }): ResidentProfile {
    return {
      id: row.id,
      openid: row.openid,
      nickname: row.nickname,
      avatar: row.avatar,
      phone: row.phone,
      hasUnionid: Boolean(row.unionid),
    };
  }

  private async persistResidentUnionidOnLogin(residentId: number, unionid: string): Promise<void> {
    try {
      await this.applyResidentUnionidPairing(residentId, unionid, { strict: false });
    } catch (error) {
      this.logger.warn(
        `login persist unionid skipped: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async applyResidentUnionidPairing(
    residentId: number,
    unionid: string,
    options: { strict: boolean },
  ): Promise<void> {
    const resident = await this.prismaService.resident.findUnique({
      where: { id: residentId },
      select: { id: true, unionid: true },
    });
    if (!resident) {
      if (options.strict) throw new NotFoundException('居民不存在');
      return;
    }
    if (resident.unionid && resident.unionid !== unionid) {
      if (options.strict) throw new ConflictException('请先解绑原微信后再绑定');
      this.logger.warn(`skip unionid overwrite for resident ${residentId}`);
      return;
    }

    const unionidOwner = await this.prismaService.resident.findUnique({
      where: { unionid },
      select: { id: true },
    });
    if (unionidOwner && unionidOwner.id !== residentId) {
      if (options.strict) throw new ConflictException('该微信已绑定其他居民账号');
      this.logger.warn(`skip unionid ${unionid}: already owned by resident ${unionidOwner.id}`);
      return;
    }

    const follower = await this.prismaService.wechatOaFollower.findFirst({
      where: { unionid },
    });
    if (follower?.residentId && follower.residentId !== residentId) {
      if (options.strict) throw new ConflictException('该微信已绑定其他居民账号');
      this.logger.warn(`skip residentId pair: follower already bound`);
    }

    const otherFollower = await this.prismaService.wechatOaFollower.findFirst({
      where: follower ? { residentId, NOT: { id: follower.id } } : { residentId },
    });
    if (otherFollower) {
      if (options.strict) throw new ConflictException('请先解绑原微信后再绑定');
      this.logger.warn(`skip residentId pair: resident ${residentId} already bound`);
    }

    if (!resident.unionid) {
      await this.prismaService.resident.update({
        where: { id: residentId },
        data: { unionid },
      });
    }

    if (follower && !follower.residentId && !otherFollower) {
      await this.prismaService.wechatOaFollower.update({
        where: { id: follower.id },
        data: { residentId },
      });
    }
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
