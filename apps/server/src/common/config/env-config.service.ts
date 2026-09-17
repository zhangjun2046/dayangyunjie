import { Injectable } from '@nestjs/common';

const UNSET_PLACEHOLDERS = new Set(['', '待补充']);

@Injectable()
export class EnvConfigService {
  private getValue(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /** 空串 / 「待补充」视为未配置，不抛错、不起服失败。 */
  private getOptional(key: string): string | undefined {
    const value = process.env[key]?.trim();
    if (!value || UNSET_PLACEHOLDERS.has(value)) {
      return undefined;
    }
    return value;
  }

  get jwtAccessSecret(): string {
    return this.getValue('JWT_ACCESS_SECRET', 'dev_access_secret_change_me');
  }

  get jwtRefreshSecret(): string {
    return this.getValue('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me');
  }

  get jwtAccessExpiresIn(): string {
    return this.getValue('JWT_ACCESS_EXPIRES_IN', '2h');
  }

  get jwtRefreshExpiresIn(): string {
    return this.getValue('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get mockOpenidPrefix(): string {
    return this.getValue('WECHAT_MOCK_OPENID_PREFIX', 'mock_openid_');
  }

  /** 居民端小程序 AppID；未配置时微信登录/手机号走 mock */
  get wechatCustomerAppId(): string | undefined {
    return this.getOptional('WECHAT_CUSTOMER_APPID');
  }

  /** 居民端小程序 AppSecret；未配置时微信登录/手机号走 mock */
  get wechatCustomerSecret(): string | undefined {
    return this.getOptional('WECHAT_CUSTOMER_SECRET');
  }

  get hasWechatCustomerCredentials(): boolean {
    return Boolean(this.wechatCustomerAppId && this.wechatCustomerSecret);
  }

  /** 员工端小程序；勿回落居民端凭证 */
  get wechatWorkerAppId(): string | undefined {
    return this.getOptional('WECHAT_WORKER_APPID');
  }

  get wechatWorkerSecret(): string | undefined {
    return this.getOptional('WECHAT_WORKER_SECRET');
  }

  get hasWechatWorkerCredentials(): boolean {
    return Boolean(this.wechatWorkerAppId && this.wechatWorkerSecret);
  }

  get wechatOaAppId(): string | undefined {
    return this.getOptional('WECHAT_OA_APPID');
  }

  get wechatOaSecret(): string | undefined {
    return this.getOptional('WECHAT_OA_SECRET');
  }

  get wechatOaToken(): string | undefined {
    return this.getOptional('WECHAT_OA_TOKEN');
  }

  get wechatOaAesKey(): string | undefined {
    return this.getOptional('WECHAT_OA_AES_KEY');
  }

  get wechatOaEncodingMode(): string {
    return this.getOptional('WECHAT_OA_ENCODING_MODE') ?? 'plain';
  }

  get hasWechatOaCredentials(): boolean {
    return Boolean(this.wechatOaAppId && this.wechatOaSecret);
  }

  get wechatOaTmplOrderCreatedResident(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_ORDER_CREATED_RESIDENT');
  }

  get wechatOaTmplNewOrderAdmin(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_NEW_ORDER_ADMIN');
  }

  get wechatOaTmplWorkerAssigned(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_WORKER_ASSIGNED');
  }

  get wechatOaTmplAccepted(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_ACCEPTED');
  }

  get wechatOaTmplCompletedResident(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_COMPLETED_RESIDENT');
  }

  get wechatOaTmplCancelledResident(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_CANCELLED_RESIDENT');
  }

  get wechatOaTmplAcceptTimeoutAdmin(): string | undefined {
    return this.getOptional('WECHAT_OA_TMPL_ACCEPT_TIMEOUT_ADMIN');
  }

  /**
   * 运营 H5 基址。空或「待补充」→ 跳过运营微信（短信仍可发）。
   * 正式环境填 https://h5.yunjiezhixiang.cn ；不要填 PC 的 admin. 或纯 IP。
   */
  get wechatAdminH5BaseUrl(): string | undefined {
    return this.getOptional('WECHAT_ADMIN_H5_BASE_URL');
  }

  /** API 公网 origin，用于服务号 oauth redirect_uri 与模板中转。 */
  get serverBaseUrl(): string | undefined {
    return this.getOptional('SERVER_BASE_URL');
  }

  get hasWechatAdminH5BaseUrl(): boolean {
    return Boolean(this.wechatAdminH5BaseUrl);
  }

  get wechatMpReleased(): boolean {
    return process.env.WECHAT_MP_RELEASED?.trim().toLowerCase() === 'true';
  }

  get smsProvider(): string | undefined {
    return this.getOptional('SMS_PROVIDER');
  }

  get smsAccessKeyId(): string | undefined {
    return this.getOptional('SMS_ACCESS_KEY_ID');
  }

  get smsAccessKeySecret(): string | undefined {
    return this.getOptional('SMS_ACCESS_KEY_SECRET');
  }

  get smsSignName(): string | undefined {
    return this.getOptional('SMS_SIGN_NAME');
  }

  get smsEndpoint(): string {
    return this.getOptional('SMS_ENDPOINT') ?? 'dysmsapi.aliyuncs.com';
  }

  get smsRegionId(): string {
    return this.getOptional('SMS_REGION_ID') ?? 'cn-hangzhou';
  }

  get smsTmplNewOrderAdmin(): string | undefined {
    return this.getOptional('SMS_TMPL_NEW_ORDER_ADMIN');
  }

  get smsTmplWorkerAssigned(): string | undefined {
    return this.getOptional('SMS_TMPL_WORKER_ASSIGNED');
  }

  get smsTmplAcceptedResident(): string | undefined {
    return this.getOptional('SMS_TMPL_ACCEPTED_RESIDENT');
  }

  get smsTmplReminderResident(): string | undefined {
    return this.getOptional('SMS_TMPL_REMINDER_RESIDENT');
  }

  get smsTmplReminderWorker(): string | undefined {
    return this.getOptional('SMS_TMPL_REMINDER_WORKER');
  }

  get smsTmplAcceptTimeoutAdmin(): string | undefined {
    return this.getOptional('SMS_TMPL_ACCEPT_TIMEOUT_ADMIN');
  }

  /** 账号 B 的 AccessKey + 签名齐才开短信通道；模板空则单事件跳过。 */
  get hasSmsCredentials(): boolean {
    return Boolean(
      this.smsProvider && this.smsAccessKeyId && this.smsAccessKeySecret && this.smsSignName,
    );
  }
}
