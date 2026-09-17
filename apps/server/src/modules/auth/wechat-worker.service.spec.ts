import { BadRequestException } from '@nestjs/common';
import { WechatWorkerService } from './wechat-worker.service';

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    hasWechatWorkerCredentials: true,
    wechatWorkerAppId: 'wx_worker_app',
    wechatWorkerSecret: 'worker_secret',
    wechatCustomerAppId: 'wx_customer_app',
    wechatCustomerSecret: 'customer_secret',
    ...overrides,
  };
}

describe('WechatWorkerService.code2Session', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('未配置 WECHAT_WORKER_* → 明确失败，不走居民凭证', async () => {
    const svc = new WechatWorkerService(
      makeEnv({
        hasWechatWorkerCredentials: false,
        wechatWorkerAppId: undefined,
        wechatWorkerSecret: undefined,
      }) as never,
    );

    await expect(svc.code2Session('code')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.code2Session('code')).rejects.toThrow('微信员工端凭证未配置');
    expect(global.fetch).toBe(originalFetch);
  });

  it('请求使用员工端 appid/secret，且必须返回 unionid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'mp_openid', unionid: 'u_worker' }),
    }) as never;

    const svc = new WechatWorkerService(makeEnv() as never);
    const result = await svc.code2Session('js_code');

    expect(result).toEqual({ openid: 'mp_openid', unionid: 'u_worker' });
    const calledUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(calledUrl).toContain('appid=wx_worker_app');
    expect(calledUrl).toContain('secret=worker_secret');
    expect(calledUrl).not.toContain('wx_customer_app');
    expect(calledUrl).not.toContain('customer_secret');
  });

  it('无 unionid → 提示检查开放平台', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'mp_openid' }),
    }) as never;

    const svc = new WechatWorkerService(makeEnv() as never);
    await expect(svc.code2Session('js_code')).rejects.toThrow(/开放平台/);
  });
});
