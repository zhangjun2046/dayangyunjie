import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

function makePrisma() {
  return {
    worker: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wechatOaFollower: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    resident: { findUnique: jest.fn() },
  };
}

function makeWechatWorker(overrides: Record<string, unknown> = {}) {
  return {
    isConfigured: true,
    code2Session: jest.fn().mockResolvedValue({ openid: 'mp1', unionid: 'u1' }),
    ...overrides,
  };
}

function makeAuth(prisma: ReturnType<typeof makePrisma>, wechatWorker = makeWechatWorker()) {
  return new AuthService(
    prisma as any,
    { signAsync: jest.fn(), verifyAsync: jest.fn() } as any,
    {} as any,
    { isConfigured: false } as any,
    wechatWorker as any,
    { createAdminAuthorizeUrl: jest.fn() } as any,
  );
}

describe('AuthService.bindWorkerWechat', () => {
  it('写入 unionid / mpOpenid，并对上粉丝表 workerId', async () => {
    const prisma = makePrisma();
    prisma.worker.findUnique
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, unionid: 'u1' });
    prisma.wechatOaFollower.findFirst
      .mockResolvedValueOnce({ id: 9, workerId: null, unionid: 'u1', subscribed: true })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, workerId: 1, subscribed: true });
    prisma.worker.update.mockResolvedValue({});
    prisma.wechatOaFollower.update.mockResolvedValue({});

    const auth = makeAuth(prisma);
    const result = await auth.bindWorkerWechat(1, 'js_code');

    expect(prisma.worker.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { unionid: 'u1', mpOpenid: 'mp1' },
    });
    expect(prisma.wechatOaFollower.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { workerId: 1 },
    });
    expect(result).toEqual({ bound: true, oaPaired: true, subscribed: true });
  });

  it('unionid 已被其他员工占用 → ConflictException', async () => {
    const prisma = makePrisma();
    prisma.worker.findUnique
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce({ id: 2 });

    const auth = makeAuth(prisma);
    await expect(auth.bindWorkerWechat(1, 'js_code')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.worker.update).not.toHaveBeenCalled();
  });

  it('当前员工已绑其他 unionid → 须显式解绑', async () => {
    const prisma = makePrisma();
    prisma.worker.findUnique.mockResolvedValueOnce({ id: 1, unionid: 'old_u' });

    const auth = makeAuth(prisma);
    await expect(auth.bindWorkerWechat(1, 'js_code')).rejects.toThrow(/解绑/);
  });

  it('员工不存在 → NotFoundException', async () => {
    const prisma = makePrisma();
    prisma.worker.findUnique.mockResolvedValueOnce(null);
    const auth = makeAuth(prisma);
    await expect(auth.bindWorkerWechat(99, 'js_code')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('粉丝表该 unionid 已绑其他员工 → 不得覆盖', async () => {
    const prisma = makePrisma();
    prisma.worker.findUnique
      .mockResolvedValueOnce({ id: 1, unionid: null })
      .mockResolvedValueOnce(null);
    prisma.wechatOaFollower.findFirst.mockResolvedValueOnce({
      id: 9,
      workerId: 8,
      unionid: 'u1',
    });

    const auth = makeAuth(prisma);
    await expect(auth.bindWorkerWechat(1, 'js_code')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.worker.update).not.toHaveBeenCalled();
  });
});
