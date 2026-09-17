import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../common/config/env-config.service';

interface WechatCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatWorkerService {
  private readonly logger = new Logger(WechatWorkerService.name);

  constructor(private readonly envConfigService: EnvConfigService) {}

  get isConfigured(): boolean {
    return this.envConfigService.hasWechatWorkerCredentials;
  }

  async code2Session(jsCode: string): Promise<{ openid: string; unionid: string }> {
    const appId = this.envConfigService.wechatWorkerAppId;
    const secret = this.envConfigService.wechatWorkerSecret;
    if (!appId || !secret) {
      throw new BadRequestException('微信员工端凭证未配置');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', jsCode);
    url.searchParams.set('grant_type', 'authorization_code');

    const data = await this.getJson<WechatCode2SessionResponse>(url.toString());
    if (data.errcode || !data.openid) {
      this.logger.warn(`worker code2session failed: errcode=${data.errcode} errmsg=${data.errmsg}`);
      throw new BadRequestException(data.errmsg || '微信绑定失败，请重试');
    }

    if (!data.unionid) {
      this.logger.warn('worker code2session 未返回 unionid');
      throw new BadRequestException('未获取到 unionid，请检查开放平台是否绑定员工端小程序与服务号');
    }

    return { openid: data.openid, unionid: data.unionid };
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(`微信接口请求失败（HTTP ${response.status}）`);
    }
    return (await response.json()) as T;
  }
}
