import { EnvConfigService } from './env-config.service';

const TRACKED_KEYS = [
  'WECHAT_CUSTOMER_APPID',
  'WECHAT_CUSTOMER_SECRET',
  'WECHAT_WORKER_APPID',
  'WECHAT_WORKER_SECRET',
  'WECHAT_OA_APPID',
  'WECHAT_OA_SECRET',
  'WECHAT_OA_TOKEN',
  'WECHAT_ADMIN_H5_BASE_URL',
  'WECHAT_MP_RELEASED',
  'SMS_PROVIDER',
  'SMS_ACCESS_KEY_ID',
  'SMS_ACCESS_KEY_SECRET',
  'SMS_SIGN_NAME',
] as const;

describe('EnvConfigService — C1 通知通道开关', () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of TRACKED_KEYS) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of TRACKED_KEYS) {
      if (snapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = snapshot[key];
      }
    }
  });

  it('缺凭证不抛错，各通道开关为 false', () => {
    const env = new EnvConfigService();
    expect(() => env.hasWechatCustomerCredentials).not.toThrow();
    expect(env.hasWechatCustomerCredentials).toBe(false);
    expect(env.hasWechatWorkerCredentials).toBe(false);
    expect(env.hasWechatOaCredentials).toBe(false);
    expect(env.hasSmsCredentials).toBe(false);
    expect(env.hasWechatAdminH5BaseUrl).toBe(false);
    expect(env.wechatMpReleased).toBe(false);
  });

  it('「待补充」视为未配置', () => {
    process.env.WECHAT_OA_APPID = '待补充';
    process.env.WECHAT_OA_SECRET = '待补充';
    process.env.WECHAT_ADMIN_H5_BASE_URL = '待补充';
    process.env.SMS_ACCESS_KEY_ID = '待补充';
    process.env.SMS_ACCESS_KEY_SECRET = '待补充';
    process.env.SMS_PROVIDER = 'aliyun';
    process.env.SMS_SIGN_NAME = '北京大洋云洁';

    const env = new EnvConfigService();
    expect(env.hasWechatOaCredentials).toBe(false);
    expect(env.wechatAdminH5BaseUrl).toBeUndefined();
    expect(env.hasSmsCredentials).toBe(false);
  });

  it('不混用员工 / 居民 Secret', () => {
    process.env.WECHAT_CUSTOMER_APPID = 'wx_customer';
    process.env.WECHAT_CUSTOMER_SECRET = 'customer_secret';

    const env = new EnvConfigService();
    expect(env.hasWechatCustomerCredentials).toBe(true);
    expect(env.hasWechatWorkerCredentials).toBe(false);
    expect(env.wechatWorkerAppId).toBeUndefined();
    expect(env.wechatWorkerSecret).toBeUndefined();
    expect(env.wechatCustomerSecret).toBe('customer_secret');
  });

  it('员工凭证齐时不借用居民 Secret', () => {
    process.env.WECHAT_WORKER_APPID = 'wx_worker';
    process.env.WECHAT_WORKER_SECRET = 'worker_secret';

    const env = new EnvConfigService();
    expect(env.hasWechatWorkerCredentials).toBe(true);
    expect(env.hasWechatCustomerCredentials).toBe(false);
    expect(env.wechatCustomerSecret).toBeUndefined();
  });

  it('短信 AccessKey + 签名齐才 hasSmsCredentials', () => {
    process.env.SMS_PROVIDER = 'aliyun';
    process.env.SMS_SIGN_NAME = '北京大洋云洁';
    process.env.SMS_ACCESS_KEY_ID = 'id';
    process.env.SMS_ACCESS_KEY_SECRET = 'secret';

    const env = new EnvConfigService();
    expect(env.hasSmsCredentials).toBe(true);
  });
});
