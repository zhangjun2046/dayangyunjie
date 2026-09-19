import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

function makePrisma() {
  return {
    worker: { findUnique: jest.fn(), update: jest.fn() },
    resident: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wechatOaFollower: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeAuth(
  prisma: ReturnType<typeof makePrisma>,
  wechatCustomer: Record<string, unknown>,
) {
  return new AuthService(
    prisma as any,
    { signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn() } as any,
    {
      jwtAccessSecret: 'a',
      jwtRefreshSecret: 'r',
      jwtAccessExpiresIn: '2h',
      jwtRefreshExpiresIn: '7d',
      mockOpenidPrefix: 'mock_',
    } as any,
    wechatCustomer as any,
    { isConfigured: false, code2Session: jest.fn() } as any,
    { createAdminAuthorizeUrl: jest.fn() } as any,
  );
}

describe('AuthService 居民 unionid', () => {
  it('wechatLogin 无 unionid 仍成功登录', async () => {
    const prisma = makePrisma();
    prisma.resident.findUnique.mockResolvedValue({
      id: 1,
      openid: 'o1',
      nickname: null,
      avatar: null,
      phone: null,
      unionid: null,
    });
    const auth = makeAuth(prisma, {
      isConfigured: true,
      code2Session: jest.fn().mockResolvedValue({ openid: 'o1' }),
    });

    const result = await auth.wechatLogin({ code: 'c1' });
    expect(result.resident).toMatchObject({ id: 1, openid: 'o1', hasUnionid: false });
    expect(result.tokens.accessToken).toBe('tok');
    expect(prisma.resident.update).not.toHaveBeenCalled();
  });

  it('wechatLogin 写入 unionid 并对上粉丝表 residentId', async () => {
    const prisma = makePrisma();
    prisma.resident.findUnique
      .mockResolvedValueOnce({
        id: 1,
        openid: 'o1',
        nickname: null,
        avatar: null,
        phone: null,
        unionid: null,
      })
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ unionid: 'u1' });
    prisma.wechatOaFollower.findFirst
      .mockResolvedValueOnce({ id: 9, residentId: null, unionid: 'u1', subscribed: true })
      .mockResolvedValueOnce(null);
    prisma.resident.update.mockResolvedValue({});
    prisma.wechatOaFollower.update.mockResolvedValue({});

    const auth = makeAuth(prisma, {
      isConfigured: true,
      code2Session: jest.fn().mockResolvedValue({ openid: 'o1', unionid: 'u1' }),
    });

    const result = await auth.wechatLogin({ code: 'c1' });
    expect(prisma.resident.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { unionid: 'u1' },
    });
    expect(prisma.wechatOaFollower.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { residentId: 1 },
    });
    expect(result.resident.hasUnionid).toBe(true);
  });

  it('补绑无 unionid → 明确失败且不换登录态', async () => {
    const prisma = makePrisma();
    const auth = makeAuth(prisma, {
      isConfigured: true,
      code2Session: jest.fn().mockResolvedValue({ openid: 'o1' }),
    });

    await expect(auth.bindResidentWechat(1, 'c1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(auth.bindResidentWechat(1, 'c1')).rejects.toThrow(/开放平台/);
    expect(prisma.resident.update).not.toHaveBeenCalled();
  });

  it('补绑写入 unionid', async () => {
    const prisma = makePrisma();
    prisma.resident.findUnique
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, unionid: 'u1' });
    prisma.wechatOaFollower.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.resident.update.mockResolvedValue({});

    const auth = makeAuth(prisma, {
      isConfigured: true,
      code2Session: jest.fn().mockResolvedValue({ openid: 'o1', unionid: 'u1' }),
    });

    const result = await auth.bindResidentWechat(1, 'c1');
    expect(prisma.resident.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { unionid: 'u1' },
    });
    expect(result).toEqual({ bound: true, oaPaired: false, subscribed: null });
  });

  it('补绑不得覆盖其他居民', async () => {
    const prisma = makePrisma();
    prisma.resident.findUnique
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce({ id: 2 });

    const auth = makeAuth(prisma, {
      isConfigured: true,
      code2Session: jest.fn().mockResolvedValue({ openid: 'o1', unionid: 'u1' }),
    });

    await expect(auth.bindResidentWechat(1, 'c1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.resident.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.bindPhone', () => {
  it('按 JWT residentId 更新 residents.phone', async () => {
    const prisma = makePrisma();
    prisma.resident.update.mockResolvedValue({ id: 7, phone: '16601124086' });
    const auth = makeAuth(prisma, { isConfigured: false });

    const result = await auth.bindPhone('16601124086', {
      residentId: 7,
      openid: 'o1',
      role: 'resident',
    });

    expect(result).toEqual({ phone: '16601124086' });
    expect(prisma.resident.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { phone: '16601124086' },
    });
  });
});
