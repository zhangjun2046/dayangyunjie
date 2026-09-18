import { WechatOaOauthTargetType } from '@prisma/client';
import { hashOaOauthToken } from './wechat-oa-url';
import { WechatOaService } from './wechat-oa.service';

describe('WechatOaService oauth / redirect', () => {
  const env = {
    hasWechatOaCredentials: true,
    wechatOaToken: 'token',
    wechatOaAppId: 'wxoa',
    wechatOaSecret: 'secret',
    wechatOaEncodingMode: 'plain',
    wechatAdminH5BaseUrl: 'https://h5.yunjiezhixiang.cn',
    serverBaseUrl: 'https://api.yunjiezhixiang.cn',
  };

  it('invalid / used / expired state 不调微信', async () => {
    const prisma = {
      wechatOaOauthState: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 1,
            targetType: WechatOaOauthTargetType.ADMIN,
            targetId: 9,
            usedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
          })
          .mockResolvedValueOnce({
            id: 2,
            targetType: WechatOaOauthTargetType.ADMIN,
            targetId: 9,
            usedAt: null,
            expiresAt: new Date(Date.now() - 1000),
          }),
        update: jest.fn(),
      },
    };
    const svc = new WechatOaService(env as never, prisma as never);

    await expect(svc.resolveOauthCallback('code', 'missing')).resolves.toEqual({
      status: 'error',
      reason: 'invalid_state',
    });
    await expect(svc.resolveOauthCallback('code', 'used')).resolves.toEqual({
      status: 'error',
      reason: 'used',
    });
    await expect(svc.resolveOauthCallback('code', 'expired')).resolves.toEqual({
      status: 'error',
      reason: 'expired',
    });
    expect(prisma.wechatOaOauthState.update).not.toHaveBeenCalled();
  });

  it('解绑运营只清 adminId，未绑定则失败', async () => {
    const prisma = {
      wechatOaFollower: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 4, adminId: 9, subscribed: true, workerId: 2 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const svc = new WechatOaService(env as never, prisma as never);

    await expect(svc.unbindAdminOpenid(9)).rejects.toThrow('该账号未绑定微信');
    await expect(svc.unbindAdminOpenid(9)).resolves.toBeUndefined();
    expect(prisma.wechatOaFollower.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { adminId: null },
    });
  });

  it('中转 Location 只拼本站 H5 详情', () => {
    const svc = new WechatOaService(env as never, {} as never);
    expect(svc.adminOrderRedirectLocation('cleaning', '8')).toBe(
      'https://h5.yunjiezhixiang.cn/#/pages/order-detail/index?id=8&type=cleaning',
    );
    expect(svc.adminOrderRedirectLocation('consult', '1')).toBeNull();
    expect(hashOaOauthToken('abc')).toHaveLength(64);
  });
});
