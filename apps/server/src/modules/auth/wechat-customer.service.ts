import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../common/config/env-config.service';

interface WechatTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatPhoneResponse {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber?: string;
    purePhoneNumber?: string;
    countryCode?: string;
  };
}

@Injectable()
export class WechatCustomerService {
  private readonly logger = new Logger(WechatCustomerService.name);
  private cachedAccessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(private readonly envConfigService: EnvConfigService) {}

  get isConfigured(): boolean {
    return this.envConfigService.hasWechatCustomerCredentials;
  }

  async code2Session(jsCode: string): Promise<{ openid: string }> {
    const appId = this.envConfigService.wechatCustomerAppId;
    const secret = this.envConfigService.wechatCustomerSecret;
    if (!appId || !secret) {
      throw new BadRequestException('微信小程序凭证未配置');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', jsCode);
    url.searchParams.set('grant_type', 'authorization_code');

    const data = await this.getJson<WechatCode2SessionResponse>(url.toString());
    if (data.errcode || !data.openid) {
      this.logger.warn(`code2session failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
      throw new BadRequestException(data.errmsg || '微信登录失败，请重试');
    }

    return { openid: data.openid };
  }

  async getPhoneNumber(code: string): Promise<{ phone: string }> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`;

    const data = await this.postJson<WechatPhoneResponse>(url, { code });
    if (data.errcode || !data.phone_info) {
      this.logger.warn(`getuserphonenumber failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
      // access_token 偶发失效时清空缓存，便于下次重试
      if (data.errcode === 40001 || data.errcode === 42001) {
        this.cachedAccessToken = null;
        this.accessTokenExpiresAt = 0;
      }
      throw new BadRequestException(data.errmsg || '获取手机号失败，请重试');
    }

    const phone = data.phone_info.purePhoneNumber || data.phone_info.phoneNumber;
    if (!phone) {
      throw new BadRequestException('微信未返回手机号');
    }

    return { phone };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && now < this.accessTokenExpiresAt) {
      return this.cachedAccessToken;
    }

    const appId = this.envConfigService.wechatCustomerAppId;
    const secret = this.envConfigService.wechatCustomerSecret;
    if (!appId || !secret) {
      throw new BadRequestException('微信小程序凭证未配置');
    }

    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);

    const data = await this.getJson<WechatTokenResponse>(url.toString());
    if (data.errcode || !data.access_token) {
      this.logger.warn(`getAccessToken failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
      throw new BadRequestException(data.errmsg || '获取微信 access_token 失败');
    }

    const expiresInMs = Math.max((data.expires_in ?? 7200) - 300, 60) * 1000;
    this.cachedAccessToken = data.access_token;
    this.accessTokenExpiresAt = now + expiresInMs;
    return data.access_token;
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`微信接口请求失败（HTTP ${response.status}）`);
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
      throw new BadRequestException(`微信接口请求失败（HTTP ${response.status}）`);
    }
    return (await response.json()) as T;
  }
}
