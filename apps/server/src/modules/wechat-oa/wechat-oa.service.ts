import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { WechatOaOauthTargetType } from '@prisma/client';
import { EnvConfigService } from '../../common/config/env-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { verifyWechatOaSignature } from './wechat-oa-signature';
import {
  buildAdminH5HashUrl,
  buildAdminOauthLandingHash,
  buildAdminOrderDetailHash,
  buildWechatSnsAuthorizeUrl,
  hashOaOauthToken,
  oauthCallbackRedirectUri,
  parseOaRedirectTarget,
} from './wechat-oa-url';
import { parseWechatOaXml } from './wechat-oa-xml';

const NONCE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatUserInfoResponse {
  unionid?: string;
  subscribe?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatOauthTokenResponse {
  access_token?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export type OaOauthCallbackResult = { status: 'ok' | 'error'; reason?: string };

@Injectable()
export class WechatOaService {
  private readonly logger = new Logger(WechatOaService.name);
  private cachedAccessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private readonly usedNonces = new Map<string, number>();

  constructor(
    private readonly envConfigService: EnvConfigService,
    private readonly prisma: PrismaService,
  ) {}

  get isConfigured(): boolean {
    return this.envConfigService.hasWechatOaCredentials && Boolean(this.envConfigService.wechatOaToken);
  }

  verifyCallbackSignature(query: {
    signature?: string;
    timestamp?: string;
    nonce?: string;
  }): boolean {
    const token = this.envConfigService.wechatOaToken;
    if (!token) {
      this.logger.warn('WECHAT_OA_TOKEN unset; skip OA callback');
      return false;
    }
    return verifyWechatOaSignature({
      token,
      signature: query.signature,
      timestamp: query.timestamp,
      nonce: query.nonce,
    });
  }

  /** POST 事件才记 nonce；GET echostr 可能重试同一 nonce，不能记。 */
  consumeCallbackNonce(nonce?: string): boolean {
    const value = nonce?.trim() ?? '';
    if (!value) {
      return false;
    }
    this.pruneNonces();
    if (this.usedNonces.has(value)) {
      this.logger.warn('OA callback nonce replay');
      return false;
    }
    this.usedNonces.set(value, Date.now() + NONCE_TTL_MS);
    return true;
  }

  verifyPostCallbackQuery(query: {
    signature?: string;
    timestamp?: string;
    nonce?: string;
  }): boolean {
    return this.verifyCallbackSignature(query) && this.consumeCallbackNonce(query.nonce);
  }

  async handleCallbackXml(xml: string): Promise<void> {
    if (this.envConfigService.wechatOaEncodingMode !== 'plain') {
      this.logger.warn(`OA encoding ${this.envConfigService.wechatOaEncodingMode} not supported; ignore`);
      return;
    }
    if (!xml?.trim()) {
      this.logger.warn('OA callback empty body; check text/xml body parser');
      return;
    }
    if (/<Encrypt>/i.test(xml)) {
      this.logger.warn('OA callback looks encrypted; ignore in plain mode');
      return;
    }

    const parsed = parseWechatOaXml(xml);
    if (parsed.msgType !== 'event' || !parsed.oaOpenid) {
      return;
    }
    if (parsed.event === 'subscribe') {
      await this.onSubscribe(parsed.oaOpenid);
      this.logger.log(`OA subscribe upserted openid=${parsed.oaOpenid.slice(0, 8)}…`);
      return;
    }
    if (parsed.event === 'unsubscribe') {
      await this.onUnsubscribe(parsed.oaOpenid);
      this.logger.log(`OA unsubscribe openid=${parsed.oaOpenid.slice(0, 8)}…`);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.envConfigService.hasWechatOaCredentials) {
      return null;
    }
    const now = Date.now();
    if (this.cachedAccessToken && now < this.accessTokenExpiresAt) {
      return this.cachedAccessToken;
    }

    const appId = this.envConfigService.wechatOaAppId;
    const secret = this.envConfigService.wechatOaSecret;
    if (!appId || !secret) {
      return null;
    }

    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);

    try {
      const data = await this.getJson<WechatTokenResponse>(url.toString());
      if (data.errcode || !data.access_token) {
        this.logger.warn(`OA token failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
        return null;
      }
      const expiresInMs = Math.max((data.expires_in ?? 7200) - 300, 60) * 1000;
      this.cachedAccessToken = data.access_token;
      this.accessTokenExpiresAt = now + expiresInMs;
      return data.access_token;
    } catch (error) {
      this.logger.warn(`OA token request failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
  }

  async getUserInfo(oaOpenid: string): Promise<{ unionid?: string } | null> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }
    const url = new URL('https://api.weixin.qq.com/cgi-bin/user/info');
    url.searchParams.set('access_token', token);
    url.searchParams.set('openid', oaOpenid);
    url.searchParams.set('lang', 'zh_CN');
    try {
      const data = await this.getJson<WechatUserInfoResponse>(url.toString());
      if (data.errcode) {
        this.logger.warn(`OA user/info failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
        if (data.errcode === 40001 || data.errcode === 42001) {
          this.cachedAccessToken = null;
          this.accessTokenExpiresAt = 0;
        }
        return null;
      }
      return { unionid: data.unionid };
    } catch (error) {
      this.logger.warn(`OA user/info request failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
  }

  private async onSubscribe(oaOpenid: string): Promise<void> {
    const existing = await this.prisma.wechatOaFollower.findUnique({ where: { oaOpenid } });
    const info = await this.getUserInfo(oaOpenid);
    const unionid = info?.unionid || existing?.unionid || null;

    let workerId = existing?.workerId ?? null;
    let residentId = existing?.residentId ?? null;
    const adminId = existing?.adminId ?? null;

    if (unionid) {
      if (!workerId) {
        const worker = await this.prisma.worker.findUnique({ where: { unionid } });
        if (worker) {
          const taken = await this.prisma.wechatOaFollower.findFirst({
            where: { workerId: worker.id, NOT: { oaOpenid } },
          });
          if (taken) {
            this.logger.warn(`skip workerId pair: worker ${worker.id} already bound`);
          } else {
            workerId = worker.id;
          }
        }
      }
      if (!residentId) {
        const resident = await this.prisma.resident.findUnique({ where: { unionid } });
        if (resident) {
          const taken = await this.prisma.wechatOaFollower.findFirst({
            where: { residentId: resident.id, NOT: { oaOpenid } },
          });
          if (taken) {
            this.logger.warn(`skip residentId pair: resident ${resident.id} already bound`);
          } else {
            residentId = resident.id;
          }
        }
      }
    }

    const now = new Date();
    await this.prisma.wechatOaFollower.upsert({
      where: { oaOpenid },
      create: {
        oaOpenid,
        unionid,
        subscribed: true,
        subscribedAt: now,
        unsubscribedAt: null,
        adminId,
        workerId,
        residentId,
      },
      update: {
        unionid,
        subscribed: true,
        subscribedAt: now,
        unsubscribedAt: null,
        workerId,
        residentId,
      },
    });
  }

  private async onUnsubscribe(oaOpenid: string): Promise<void> {
    const now = new Date();
    await this.prisma.wechatOaFollower.upsert({
      where: { oaOpenid },
      create: {
        oaOpenid,
        subscribed: false,
        unsubscribedAt: now,
      },
      update: {
        subscribed: false,
        unsubscribedAt: now,
      },
    });
  }

  async createAdminAuthorizeUrl(adminId: number): Promise<string> {
    if (!this.isConfigured) {
      throw new BadRequestException('服务号凭证未配置');
    }
    const appId = this.envConfigService.wechatOaAppId;
    const redirectUri = oauthCallbackRedirectUri(this.envConfigService.serverBaseUrl);
    const h5Base = this.envConfigService.wechatAdminH5BaseUrl;
    if (!appId || !redirectUri || !h5Base) {
      throw new BadRequestException('服务号网页授权未就绪（需 SERVER_BASE_URL 与运营 H5 基址）');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException('管理员不存在');
    }

    const state = randomBytes(16).toString('hex');
    await this.prisma.wechatOaOauthState.create({
      data: {
        tokenHash: hashOaOauthToken(state),
        targetType: WechatOaOauthTargetType.ADMIN,
        targetId: adminId,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
        createdByAdminId: adminId,
      },
    });

    return buildWechatSnsAuthorizeUrl({
      appId,
      redirectUri,
      state,
    });
  }

  async resolveOauthCallback(code?: string, state?: string): Promise<OaOauthCallbackResult> {
    const trimmedCode = code?.trim() ?? '';
    const trimmedState = state?.trim() ?? '';
    if (!trimmedCode) {
      return { status: 'error', reason: 'missing_code' };
    }
    if (!trimmedState) {
      return { status: 'error', reason: 'invalid_state' };
    }

    const row = await this.prisma.wechatOaOauthState.findUnique({
      where: { tokenHash: hashOaOauthToken(trimmedState) },
    });
    if (!row || row.targetType !== WechatOaOauthTargetType.ADMIN) {
      return { status: 'error', reason: 'invalid_state' };
    }
    if (row.usedAt) {
      return { status: 'error', reason: 'used' };
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return { status: 'error', reason: 'expired' };
    }

    const exchanged = await this.exchangeOauthCode(trimmedCode);
    if (!exchanged?.oaOpenid) {
      return { status: 'error', reason: 'oauth_failed' };
    }

    try {
      await this.bindAdminOpenid(row.targetId, exchanged.oaOpenid, exchanged.unionid);
      await this.prisma.wechatOaOauthState.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      return { status: 'ok' };
    } catch (error) {
      this.logger.warn(`admin oauth bind failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return { status: 'error', reason: 'conflict' };
    }
  }

  adminLandingLocation(result: OaOauthCallbackResult): string | null {
    const h5Base = this.envConfigService.wechatAdminH5BaseUrl;
    if (!h5Base) {
      return null;
    }
    return buildAdminH5HashUrl(h5Base, buildAdminOauthLandingHash(result));
  }

  adminOrderRedirectLocation(type?: string, id?: string): string | null {
    const h5Base = this.envConfigService.wechatAdminH5BaseUrl;
    const target = parseOaRedirectTarget(type, id);
    if (!h5Base || !target) {
      return null;
    }
    return buildAdminH5HashUrl(h5Base, buildAdminOrderDetailHash(target));
  }

  private async exchangeOauthCode(code: string): Promise<{ oaOpenid: string; unionid?: string } | null> {
    const appId = this.envConfigService.wechatOaAppId;
    const secret = this.envConfigService.wechatOaSecret;
    if (!appId || !secret) {
      return null;
    }
    const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('code', code);
    url.searchParams.set('grant_type', 'authorization_code');
    try {
      const data = await this.getJson<WechatOauthTokenResponse>(url.toString());
      if (data.errcode || !data.openid) {
        this.logger.warn(`OA oauth failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
        return null;
      }
      return { oaOpenid: data.openid, unionid: data.unionid };
    } catch (error) {
      this.logger.warn(`OA oauth request failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
  }

  private async bindAdminOpenid(adminId: number, oaOpenid: string, unionid?: string): Promise<void> {
    const existing = await this.prisma.wechatOaFollower.findUnique({ where: { oaOpenid } });
    if (existing?.adminId && existing.adminId !== adminId) {
      throw new Error('openid already bound');
    }

    const previous = await this.prisma.wechatOaFollower.findUnique({ where: { adminId } });
    if (previous && previous.oaOpenid !== oaOpenid) {
      await this.prisma.wechatOaFollower.update({
        where: { id: previous.id },
        data: { adminId: null },
      });
    }

    await this.prisma.wechatOaFollower.upsert({
      where: { oaOpenid },
      create: {
        oaOpenid,
        unionid: unionid ?? null,
        subscribed: existing?.subscribed ?? false,
        adminId,
      },
      update: {
        adminId,
        unionid: unionid || existing?.unionid,
      },
    });
  }

  /** 只摘运营挂载，保留粉丝行与关注状态、员工/居民绑定。 */
  async unbindAdminOpenid(adminId: number): Promise<void> {
    const follower = await this.prisma.wechatOaFollower.findUnique({ where: { adminId } });
    if (!follower) {
      throw new BadRequestException('该账号未绑定微信');
    }
    await this.prisma.wechatOaFollower.update({
      where: { id: follower.id },
      data: { adminId: null },
    });
  }

  /**
   * 服务号模板消息。失败只打日志并返回 false，不抛给业务。
   * 调用方须保证 url 与 miniprogram 互斥。
   */
  async sendTemplate(input: {
    oaOpenid: string;
    templateId: string;
    data: Record<string, string>;
    url?: string;
    miniprogram?: { appid: string; pagepath: string };
  }): Promise<boolean> {
    if (!input.oaOpenid || !input.templateId) {
      this.logger.log('oa template skip: missing openid or templateId');
      return false;
    }
    if (input.url && input.miniprogram) {
      this.logger.warn('oa template skip: url and miniprogram both set');
      return false;
    }

    const token = await this.getAccessToken();
    if (!token) {
      this.logger.log('oa template skip: no access_token');
      return false;
    }

    const data: Record<string, { value: string }> = {};
    for (const [key, value] of Object.entries(input.data)) {
      if (value === undefined || value === null || value === '') continue;
      data[key] = { value };
    }

    const body: Record<string, unknown> = {
      touser: input.oaOpenid,
      template_id: input.templateId,
      data,
    };
    if (input.url) {
      body.url = input.url;
    }
    if (input.miniprogram) {
      body.miniprogram = input.miniprogram;
    }

    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(token)}`;
    try {
      const result = await this.postJson<{ errcode?: number; errmsg?: string }>(url, body);
      if (result.errcode && result.errcode !== 0) {
        this.logger.warn(`oa template failed: errcode=${result.errcode} errmsg=${result.errmsg}`);
        if (result.errcode === 40001 || result.errcode === 42001) {
          this.cachedAccessToken = null;
          this.accessTokenExpiresAt = 0;
        }
        return false;
      }
      this.logger.log('oa template accepted');
      return true;
    } catch (error) {
      this.logger.warn(`oa template request failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }

  private pruneNonces(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.usedNonces) {
      if (expiresAt <= now) {
        this.usedNonces.delete(nonce);
      }
    }
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private async postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
