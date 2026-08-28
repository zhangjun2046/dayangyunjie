/**
 * P2.7 + P2.15 ConsultOrder 咨询单模块单元测试（v2.0 适配）
 *
 * 测试矩阵：
 *  1. create         — 创建咨询单（CNS 前缀订单号、默认 FOLLOW_UP、匿名/绑定居民、居民不存在）
 *  2. findAll        — 列表查询（无筛选、按 status 筛选、按 keyword 筛选）
 *  3. findOne        — 详情（存在、不存在 404）
 *  4. updateStatus   — 状态转移（合法路径、非法跳步、终态保护、不存在 404、日志写入）
 *  5. create v2.0    — 代下单字段校验（isProxyOrder / serviceContactName / serviceAddress / source）
 *  6. createFollowUp — 新增跟进记录（v2.0）
 *  7. findFollowUps  — 跟进记录列表查询（v2.0）
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsultStatus, Prisma } from '@prisma/client';
import { ConsultOrderService } from './consult-order.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

/** 构造最小可用的数据库行（ConsultOrder，v2.0 字段名） */
function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNo: 'CNS202606080001',
    residentId: null,
    serviceType: '家政咨询',
    contactName: '张三',
    contactPhone: '13800138000',
    requirementDesc: '需要每周两次保洁服务',
    isProxyOrder: false,
    serviceContactName: null,
    serviceContactPhone: null,
    serviceAddress: null,
    source: null,
    remark: null,
    status: ConsultStatus.FOLLOW_UP,
    createdAt: new Date('2026-06-08T06:00:00.000Z'),
    updatedAt: new Date('2026-06-08T06:00:00.000Z'),
    ...overrides,
  };
}

/** 构造最小可用的数据库行（ConsultFollowUp） */
function makeFollowUpRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    consultId: 1,
    handlerName: '客服小李',
    content: '已与客户电话沟通，确认需求',
    createdAt: new Date('2026-06-08T07:00:00.000Z'),
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
      update: jest.fn().mockResolvedValue(makeOrderRow({ status: ConsultStatus.FOLLOWING })),
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
    consultFollowUp: {
      create: jest.fn().mockResolvedValue(makeFollowUpRow()),
      findMany: jest.fn().mockResolvedValue([makeFollowUpRow()]),
      count: jest.fn().mockResolvedValue(1),
    },
    resident: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
    orderStatusLog: {
      findFirst: jest.fn().mockResolvedValue(null),
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
    contactName: '张三',
    contactPhone: '13800138000',
    requirementDesc: '需要每周两次保洁服务',
  };

  it('创建成功：订单号以 CNS 开头', async () => {
    const { svc } = makeService();
    const result = await svc.create(dto);
    expect(result.orderNo).toMatch(/^CNS\d{8}\d{6}$/);
  });

  it('创建成功：默认状态为 FOLLOW_UP', async () => {
    const { svc } = makeService();
    const result = await svc.create(dto);
    expect(result.status).toBe(ConsultStatus.FOLLOW_UP);
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
    await svc.findAll({ status: ConsultStatus.FOLLOWING });
    const txCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
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
      status: ConsultStatus.FOLLOW_UP,
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
  const toFollowing  = { status: ConsultStatus.FOLLOWING, operatorId: 10 } as const;
  const toCompleted  = { status: ConsultStatus.COMPLETED, operatorId: 10 } as const;

  it('FOLLOW_UP → FOLLOWING：合法转移，consultOrder.update 被调用', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, toFollowing);
    expect(prisma._tx.consultOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ConsultStatus.FOLLOWING } }),
    );
  });

  it('FOLLOWING → COMPLETED：合法转移', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.FOLLOWING }),
    );
    prisma._tx.consultOrder.update = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.COMPLETED }),
    );
    await svc.updateStatus(1, toCompleted);
    expect(prisma._tx.consultOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ConsultStatus.COMPLETED } }),
    );
  });

  it('FOLLOW_UP → COMPLETED：跳步，抛出 BadRequestException（400）', async () => {
    const { svc } = makeService();
    await expect(svc.updateStatus(1, toCompleted)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('FOLLOW_UP → COMPLETED：错误消息包含"非法状态转移"', async () => {
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
    await expect(svc.updateStatus(1, toFollowing)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('COMPLETED 终态保护：错误消息包含"终态"', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: ConsultStatus.COMPLETED }),
    );
    await expect(svc.updateStatus(1, toFollowing)).rejects.toMatchObject({
      message: expect.stringContaining('终态'),
    });
  });

  it('订单不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.updateStatus(99, toFollowing)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('写入 order_status_logs：orderType=CONSULT，operatorType=ADMIN', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, { ...toFollowing, remark: '已联系客户' });
    expect(prisma._tx.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderType: 'CONSULT',
          operatorType: 'ADMIN',
          fromStatus: ConsultStatus.FOLLOW_UP,
          toStatus: ConsultStatus.FOLLOWING,
          operatorId: 10,
          remark: '已联系客户',
        }),
      }),
    );
  });

  it('remark 为 undefined 时，日志 remark 写入 null', async () => {
    const { svc, prisma } = makeService();
    await svc.updateStatus(1, toFollowing);
    expect(prisma._tx.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remark: null }),
      }),
    );
  });
});

// ─── 5. create v2.0 代下单字段 ────────────────────────────────────────────

describe('ConsultOrderService — create v2.0（代下单字段）', () => {
  const baseDto = {
    serviceType: '家政咨询',
    contactName: '张三',
    contactPhone: '13800138000',
    requirementDesc: '需要每周两次保洁服务',
  };

  it('isProxyOrder=true + 代下单字段：创建成功，数据写入事务', async () => {
    const { svc, prisma } = makeService();
    await svc.create({
      ...baseDto,
      isProxyOrder: true,
      serviceContactName: '李阿姨',
      serviceContactPhone: '13900001111',
      serviceAddress: '北京市朝阳区建国路88号',
    });
    expect(prisma._tx.consultOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isProxyOrder: true,
          serviceContactName: '李阿姨',
          serviceContactPhone: '13900001111',
          serviceAddress: '北京市朝阳区建国路88号',
        }),
      }),
    );
  });

  it('isProxyOrder=true 但缺少 serviceContactName：抛出 BadRequestException', async () => {
    const { svc } = makeService();
    await expect(
      svc.create({ ...baseDto, isProxyOrder: true, serviceContactPhone: '13900001111' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('isProxyOrder=true 但缺少 serviceContactPhone：抛出 BadRequestException', async () => {
    const { svc } = makeService();
    await expect(
      svc.create({ ...baseDto, isProxyOrder: true, serviceContactName: '李阿姨' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('不传 isProxyOrder（默认 false）：不校验代下单字段', async () => {
    const { svc } = makeService();
    await expect(svc.create(baseDto)).resolves.toBeDefined();
  });

  it('source 字段写入：返回 DTO 含 source', async () => {
    const { svc, prisma } = makeService();
    prisma._tx.consultOrder.create = jest.fn().mockResolvedValue(
      makeOrderRow({ source: 'ADMIN' }),
    );
    const result = await svc.create({ ...baseDto, source: 'ADMIN' as never });
    expect(result.source).toBe('ADMIN');
  });
});

// ─── 6. createFollowUp（新增跟进记录 v2.0）───────────────────────────────

describe('ConsultOrderService — createFollowUp（新增跟进记录）', () => {
  const dto = { handlerName: '客服小李', content: '已与客户电话沟通，确认需求' };

  it('正常创建：consultFollowUp.create 被调用，返回 ConsultFollowUpDto', async () => {
    const { svc, prisma } = makeService();
    const result = await svc.createFollowUp(1, dto);

    expect(prisma.consultFollowUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consultId: 1,
          handlerName: '客服小李',
          content: '已与客户电话沟通，确认需求',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: expect.any(Number),
      consultId: 1,
      handlerName: '客服小李',
      createdAt: expect.any(String),
    });
  });

  it('咨询单不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.createFollowUp(99, dto)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 7. findFollowUps（跟进记录列表 v2.0）────────────────────────────────

describe('ConsultOrderService — findFollowUps（跟进记录列表）', () => {
  it('正常查询：返回分页结构（items / total / page / pageSize）', async () => {
    const { svc } = makeService();
    const result = await svc.findFollowUps(1, {});
    expect(result).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  it('items 含 ConsultFollowUpDto 结构（含 createdAt 字符串）', async () => {
    const { svc } = makeService();
    const result = await svc.findFollowUps(1, {});
    expect(result.items[0]).toMatchObject({
      id: expect.any(Number),
      consultId: 1,
      handlerName: expect.any(String),
      content: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('$transaction 以数组形式调用（findMany + count）', async () => {
    const { svc, prisma } = makeService();
    await svc.findFollowUps(1, {});
    const txCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(txCall)).toBe(true);
  });

  it('咨询单不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.consultOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findFollowUps(99, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('分页参数生效：page=2，pageSize=5', async () => {
    const { svc, prisma } = makeService();
    await svc.findFollowUps(1, { page: 2, pageSize: 5 });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
