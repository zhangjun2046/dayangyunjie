import { OrderProgressService } from './order-progress.service';

function makeService(logs: Array<Record<string, unknown>> = []) {
  const prisma = {
    orderStatusLog: {
      findMany: jest.fn().mockResolvedValue(logs),
    },
  };
  const jwt = { verifyAsync: jest.fn() };
  const env = { jwtAccessSecret: 'test-secret' };
  return {
    service: new OrderProgressService(prisma as never, jwt as never, env as never),
    prisma,
    jwt,
  };
}

describe('OrderProgressService', () => {
  const createdAt = new Date('2026-08-20T01:00:00.000Z');
  const assignedAt = new Date('2026-08-20T02:00:00.000Z');

  it('按观看角色组装六步进度，并隐藏未到达节点信息', async () => {
    const logs = [
      {
        id: 1,
        toStatus: 'PENDING_ASSIGN',
        createdAt,
      },
      {
        id: 2,
        toStatus: 'ASSIGNED',
        createdAt: assignedAt,
      },
    ];
    const resident = makeService(logs).service;
    const worker = makeService(logs).service;
    const admin = makeService(logs).service;

    const base = {
      orderId: 1,
      orderType: 'CLEANING' as const,
      currentStatus: 'ASSIGNED',
      createdAt,
      workerName: '张师傅',
    };
    const residentProgress = await resident.assemble({ ...base, role: 'RESIDENT' });
    const workerProgress = await worker.assemble({ ...base, role: 'WORKER' });
    const adminProgress = await admin.assemble({ ...base, role: 'ADMIN' });

    expect(residentProgress).toHaveLength(6);
    expect(residentProgress[1]).toMatchObject({
      state: 'current',
      message: '系统派单给「张师傅」',
      operatedAt: assignedAt.toISOString(),
    });
    expect(workerProgress[1].message).toBe('系统派单给了您');
    expect(adminProgress[1].message).toBe('已派单给「张师傅」');
    expect(residentProgress[2]).toMatchObject({
      state: 'pending',
      message: null,
      operatedAt: null,
    });
  });

  it('取消订单只返回已下单和已取消两个节点', async () => {
    const cancelledAt = new Date('2026-08-20T03:00:00.000Z');
    const { service } = makeService([
      { id: 1, toStatus: 'CANCELLED', createdAt: cancelledAt },
    ]);

    const progress = await service.assemble({
      orderId: 1,
      orderType: 'RECYCLING',
      currentStatus: 'CANCELLED',
      createdAt,
      role: 'ADMIN',
    });

    expect(progress.map((node) => node.status)).toEqual(['PENDING_ASSIGN', 'CANCELLED']);
    expect(progress[0]).toMatchObject({ state: 'done', operatedAt: createdAt.toISOString() });
    expect(progress[1]).toMatchObject({
      state: 'current',
      operatedAt: cancelledAt.toISOString(),
    });
  });

  it('历史家政单缺少首条日志时使用 createdAt 兜底并固定返回三步', async () => {
    const { service } = makeService([]);
    const progress = await service.assemble({
      orderId: 1,
      orderType: 'CONSULT',
      currentStatus: 'FOLLOW_UP',
      createdAt,
      role: 'RESIDENT',
    });

    expect(progress).toHaveLength(3);
    expect(progress[0]).toMatchObject({
      state: 'current',
      message: '您已提交咨询，等待平台跟进',
      operatedAt: createdAt.toISOString(),
    });
  });

  it('管理端家政详情不返回居民三步进度', async () => {
    const { service } = makeService([]);
    await expect(
      service.assemble({
        orderId: 1,
        orderType: 'CONSULT',
        currentStatus: 'FOLLOW_UP',
        createdAt,
        role: 'ADMIN',
      }),
    ).resolves.toEqual([]);
  });

  it('改派记录只覆盖管理端已派单信息，居民和员工仍使用普通文案', async () => {
    const reassignedAt = new Date('2026-08-20T02:30:00.000Z');
    const logs = [
      { id: 1, fromStatus: 'PENDING_ASSIGN', toStatus: 'ASSIGNED', createdAt: assignedAt },
      {
        id: 2,
        fromStatus: 'ASSIGNED',
        toStatus: 'ASSIGNED',
        createdAt: reassignedAt,
        remark: '服务人员由张师傅变更为李师傅（管理员改派）',
      },
    ];
    const base = {
      orderId: 1,
      orderType: 'CLEANING' as const,
      currentStatus: 'ASSIGNED',
      createdAt,
      workerName: '李师傅',
    };

    const admin = await makeService(logs).service.assemble({ ...base, role: 'ADMIN' });
    const worker = await makeService(logs).service.assemble({ ...base, role: 'WORKER' });

    expect(admin[1]).toMatchObject({
      message: '服务人员由张师傅变更为李师傅（管理员改派）',
      operatedAt: reassignedAt.toISOString(),
    });
    expect(worker[1].message).toBe('系统派单给了您');
    expect(worker[1].operatedAt).toBe(assignedAt.toISOString());
  });

  it('从已有访问令牌中解析观看角色', async () => {
    const { service, jwt } = makeService();
    jwt.verifyAsync.mockResolvedValue({ sub: 8, role: 'worker', tokenType: 'access' });

    await expect(service.resolveIdentity('Bearer token')).resolves.toEqual({
      id: 8,
      role: 'WORKER',
    });
  });
});
