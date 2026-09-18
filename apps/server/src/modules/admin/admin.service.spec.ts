import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService wechat unbind', () => {
  const adminRow = {
    id: 9,
    username: 'op',
    email: 'op@test.com',
    passwordHash: 'hash',
    name: '运营',
    phone: '13800138000',
    status: 'ENABLED',
    source: 'SYSTEM',
    isSuperAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('列表带 wechatBound', async () => {
    const prisma = {
      admin: {
        findMany: jest.fn().mockResolvedValue([{ ...adminRow, wechatOaFollowers: [{ id: 1 }] }]),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const svc = new AdminService(prisma as never, {} as never);
    const result = await svc.findAll({ page: 1, pageSize: 10 });
    expect(result.items[0].wechatBound).toBe(true);
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.items[0]).not.toHaveProperty('wechatOaFollowers');
  });

  it('超管代解绑：账号不存在 / 未绑定 / 成功', async () => {
    const prisma = {
      admin: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(adminRow)
          .mockResolvedValueOnce(adminRow)
          .mockResolvedValueOnce({ ...adminRow, wechatOaFollowers: [] }),
      },
    };
    const wechatOa = {
      unbindAdminOpenid: jest
        .fn()
        .mockRejectedValueOnce(new BadRequestException('该账号未绑定微信'))
        .mockResolvedValueOnce(undefined),
    };
    const svc = new AdminService(prisma as never, wechatOa as never);

    await expect(svc.unbindWechat(9)).rejects.toBeInstanceOf(NotFoundException);

    await expect(svc.unbindWechat(9)).rejects.toThrow('该账号未绑定微信');
    expect(wechatOa.unbindAdminOpenid).toHaveBeenCalledWith(9);

    const unbound = await svc.unbindWechat(9);
    expect(unbound.wechatBound).toBe(false);
    expect(unbound.id).toBe(9);
  });
});
