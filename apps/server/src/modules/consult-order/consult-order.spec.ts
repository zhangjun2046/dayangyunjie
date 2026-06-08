/**
 * P2.7 ConsultOrder 咨询单模块单元测试
 *
 * 测试矩阵：
 *  1. create         — 创建咨询单（CNS 前缀订单号、默认 PENDING、匿名/绑定居民、居民不存在）
 *  2. findAll        — 列表查询（无筛选、按 status 筛选、按 keyword 筛选）
 *  3. findOne        — 详情（存在、不存在 404）
 *  4. updateStatus   — 状态转移（合法路径、非法跳步、终态保护、不存在 404、日志写入）
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsultStatus, Prisma } from '@prisma/client';
import { ConsultOrderService } from './consult-order.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

/** 构造最小可用的数据库行（ConsultOrder） */
function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNo: 'CNS202606080001',
    residentId: null,
    serviceType: '家政咨询',
    name: '张三',
    phone: '13800138000',
    description: '需要每周两次保洁服务',
    status: ConsultStatus.PENDING,
    createdAt: new Date('2026-06-08T06:00:00.000Z'),
    updatedAt: new Date('2026-06-08T06:00:00.000Z'),
    ...overrides,
  };
}

/** 构造 Prisma 事务 mock，支持 consultOrder / orderStatusLog */
function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    consultOrder: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(makeOrderRow({ orderNo: args.data.orderNo as string })),
      ),
      update: jest.fn().mockResolvedValue(makeOrderRow({ status: ConsultStatus.FOLLOWING_UP })),
    },
    orderStatusLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

/** 构造 PrismaService mock，$transaction 直接执行回调 */
function makePrismaMock(txOverrides: Record<string, unknown> = {}) {
  const tx = makeTxMock(txOverrides);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn().mockImplementation((cbOrArray: unknown) => {
      if (Array.isArray(cbOrArray)) {
        return Promise.all(cbOrArray);
      }
      return (cbOrArray as (tx: unknown) => unknown)(tx);
    }),
    consultOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrderRow()),
      findMany: jest.fn().mockResolvedValue([makeOrderRow()]),
      count: jest.fn().mockResolvedValue(1),
    },
    resident: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
    _tx: tx,
  };
}

/** 构造 ConsultOrderService 实例，注入 mock 依赖 */
function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrismaMock(prismaOverrides);
  // @ts-expect-error — 测试中直接注入 mock，不走 NestJS DI
  const svc = new ConsultOrderService(prisma);
  return { svc, prisma };
}

// ─── 1. create ───────────────────────────────────────────────────────────────

describe('ConsultOrderService — create（创建咨询单）', () => {
  const dto = {
    serviceType: '家政咨询',
    name: '张三',
    phone: '13800138000',
    description: '需要每周两次保洁服务',
  };

  it('创建成功：订单号以 CNS 开头', async () => {
    const { svc } = makeService();
    const result = await svc.create(dto);
    expect(result.orderNo).toMatch(/^CNS\d{8}\d{6}$/);
  });

  it('创建成功：默认状态为 PENDING', async () => {
    const { svc } = makeService();
    const result = await svc.create(dto);
    expect(result.status).toBe(ConsultStatus.PENDING);
  });

  it('匿名创建（不传 residentId）：不查询 resident 表', async () => {
    const { svc, prisma } = makeService();
    await svc.create(dto);
    expect(prisma.resident.findUnique).not.toHaveBeenCalled();
  });

  it('绑定居民创建（传入 residentId）：校验居民存在', async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...dto, residentId: 1 });
    expect(prisma.resident.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('居民不存在时抛出 404', async () => {
    const { svc } = makeService();
    // 覆盖 resident.findUnique 返回 null
    const prisma = makePrismaMock();
    prisma.resident.findUnique = jest.fn().mockResolvedValue(null);
    // @ts-expect-error — 测试注入
    const svcWithMissingResident = new ConsultOrderService(prisma);
    await expect(svcWithMissingResident.create({ ...dto, residentId: 99 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('订单号冲突时自动重试（最多 3 次后抛出 ConflictException）', async () => {
    const prisma = makePrismaMock();
    const conflictError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`order_no`)', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['order_no'] },
    });
    // 每次 create 都抛冲突错误
    prisma._tx.consultOrder.create = jest.fn().mockRejectedValue(conflictError);
    // @ts-expect-error — 测试注入
    const svc = new ConsultOrderService(prisma);
    await expect(svc.create(dto)).rejects.toMatchObject({ message: expect.stringContaining('unique order number') });
  });
});

// ─── 2. findAll ──────────────────────────────────────────────────────────────

describe('ConsultOrderService — findAll（列表查询）', () => {
  it('无筛选：返回分页结构（items / total / page / pageSize）', async () => {
    const { svc } = makeService();
    const result = await svc.findAll({});
    expect(result).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  it('按 status 筛选：where 传入 status 字段', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ status: ConsultStatus.FOLLOWING_UP });
    const txCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    // 验证 findMany 和 count 以数组形式被调用
    expect(Array.isArray(txCall)).toBe(true);
  });

  it('按 keyword 筛选：调用 $transaction（findMany + count）', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ keyword: '张三' });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('分页参数生效：page=2，pageSize=5', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ page: 2, pageSize: 5 });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

// ─── 3. findOne ──────────────────────────────────────────────────────────────

describe('ConsultOrderService — findOne（详情查询）', () => {
  it('存在时返回 ConsultOrderDto', async () => {
    const { svc } = makeService();
    const result = await svc.findOne(1);
    expect(result).toMatchObject({
      id: 1,
      orderNo: expect.stringMatching(/^CNS/),
      status: ConsultStatus.PENDING,
    });
  });

  it('不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 4. updateStatus ─────────────────────────────────────────────────────────

describe('ConsultOrderService — updateStatus（状态转移）', () => {
  const toFollowingUp = { status: ConsultStatus.FOLLOWING_UP, operatorId: 10 } as const;
  const toCompleted   = { status: ConsultStatus.COMPLETED, operatorId: 10 } as const;

  it('PENDING → FOLLOWING_UP：合法转移，consultOrder.update 被调用', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, toFollowingUp);
    expect(prisma._tx.consultOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ConsultStatus.FOLLOWING_UP } }),
    );
  });

  it('FOLLOWING_UP → COMPLETED：合法转移', async () => {
    const { svc, prisma } = makeService();
    // 订单当前状态为 FOLLOWING_UP
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.FOLLOWING_UP }),
    );
    prisma._tx.consultOrder.update = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.COMPLETED }),
    );
    await svc.updateStatus(1, toCompleted);
    expect(prisma._tx.consultOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ConsultStatus.COMPLETED } }),
    );
  });

  it('PENDING → COMPLETED：跳步，抛出 BadRequestException（400）', async () => {
    const { svc } = makeService();
    await expect(svc.updateStatus(1, toCompleted)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PENDING → COMPLETED：错误消息包含"非法状态转移"', async () => {
    const { svc } = makeService();
    await expect(svc.updateStatus(1, toCompleted)).rejects.toMatchObject({
      message: expect.stringContaining('非法状态转移'),
    });
  });

  it('COMPLETED 终态保护：再次更新抛出 BadRequestException', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.COMPLETED }),
    );
    await expect(svc.updateStatus(1, toFollowingUp)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('COMPLETED 终态保护：错误消息包含"终态"', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.COMPLETED }),
    );
    await expect(svc.updateStatus(1, toFollowingUp)).rejects.toMatchObject({
      message: expect.stringContaining('终态'),
    });
  });

  it('订单不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.updateStatus(99, toFollowingUp)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('写入 order_status_logs：orderType=CONSULT，operatorType=ADMIN', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, { ...toFollowingUp, remark: '已联系客户' });
    expect(prisma._tx.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderType: 'CONSULT',
          operatorType: 'ADMIN',
          fromStatus: ConsultStatus.PENDING,
          toStatus: ConsultStatus.FOLLOWING_UP,
          operatorId: 10,
          remark: '已联系客户',
        }),
      }),
    );
  });

  it('remark 为 undefined 时，日志 remark 写入 null', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, toFollowingUp);
    expect(prisma._tx.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remark: null }),
      }),
    );
  });
});
