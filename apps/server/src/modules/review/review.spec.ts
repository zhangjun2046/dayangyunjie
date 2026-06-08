/**
 * P2.10 ReviewService 单元测试
 *
 * 测试矩阵：
 *  1. create  — 创建评价（成功/订单非 PENDING_REVIEW/重复评价/订单不存在/状态机调用/审计日志）
 *  2. findAll — 列表查询（分页/按 orderType 筛选/按 orderId 筛选）
 *  3. findOne — 详情（存在/不存在 404）
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ReviewService } from './review.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

function makeReviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    cleaningOrderId: 1,
    recyclingOrderId: null,
    orderType: 'CLEANING',
    rating: 5,
    tags: ['准时', '干净'],
    content: '服务很好！',
    images: null,
    createdAt: new Date('2026-06-08T10:00:00.000Z'),
    ...overrides,
  };
}

function makeCleaningOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: OrderStatus.PENDING_REVIEW,
    ...overrides,
  };
}

function makeRecyclingOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    status: OrderStatus.PENDING_REVIEW,
    ...overrides,
  };
}

/**
 * When optional JSON fields are omitted from create data, Prisma returns null from DB.
 * Normalise undefined/null to null to mirror real DB behaviour.
 */
function normPrismaJson(v: unknown): unknown {
  return v == null ? null : v;
}

/** Prisma 事务 mock */
function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    review: {
      create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve(makeReviewRow({
          rating: args.data.rating as number,
          tags: args.data.tags,
          content: args.data.content ?? null,
          images: normPrismaJson(args.data.images),
          cleaningOrderId: (args.data.cleaningOrderId as number) ?? null,
          recyclingOrderId: (args.data.recyclingOrderId as number) ?? null,
          orderType: args.data.orderType as string,
        })),
      ),
    },
    cleaningOrder: {
      update: jest.fn().mockResolvedValue({}),
    },
    recyclingOrder: {
      update: jest.fn().mockResolvedValue({}),
    },
    orderStatusLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makePrismaMock(overrides: Record<string, unknown> = {}) {
  const tx = makeTxMock();
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn().mockImplementation((cbOrArray: unknown) => {
      if (Array.isArray(cbOrArray)) {
        return Promise.all(cbOrArray);
      }
      return (cbOrArray as (tx: unknown) => unknown)(tx);
    }),
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue(makeCleaningOrderRow()),
    },
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue(makeRecyclingOrderRow()),
    },
    review: {
      findFirst: jest.fn().mockResolvedValue(null), // 默认无重复
      findUnique: jest.fn().mockResolvedValue(makeReviewRow()),
      findMany: jest.fn().mockResolvedValue([makeReviewRow()]),
      count: jest.fn().mockResolvedValue(1),
    },
    _tx: tx,
    ...overrides,
  };
}

/** stateMachine mock — transition 不抛错 */
function makeStateMachineMock() {
  return {
    validateTransition: jest.fn(),
    transition: jest.fn().mockResolvedValue('REVIEWED'),
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrismaMock(prismaOverrides);
  const stateMachine = makeStateMachineMock();
  // @ts-expect-error — 测试中直接注入 mock，不走 NestJS DI
  const svc = new ReviewService(prisma, stateMachine);
  return { svc, prisma, stateMachine };
}

const baseCreateDto = {
  orderType: 'CLEANING' as const,
  orderId: 1,
  residentId: 1,
  rating: 5,
  tags: ['准时', '干净'],
  content: '服务很好！',
};

// ─── 1. create ───────────────────────────────────────────────────────────────

describe('ReviewService — create（创建评价）', () => {
  it('保洁订单评价成功：返回 ReviewDto，rating 正确', async () => {
    const { svc } = makeService();
    const result = await svc.create(baseCreateDto);
    expect(result.rating).toBe(5);
    expect(result.orderType).toBe('CLEANING');
  });

  it('废品订单评价成功：orderType=RECYCLING', async () => {
    const { svc } = makeService();
    const result = await svc.create({ ...baseCreateDto, orderType: 'RECYCLING', orderId: 2 });
    expect(result.orderType).toBe('RECYCLING');
  });

  it('订单状态非 PENDING_REVIEW：抛出 BadRequestException', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeCleaningOrderRow({ status: OrderStatus.IN_SERVICE }),
    );
    await expect(svc.create(baseCreateDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('订单状态非 PENDING_REVIEW：错误消息包含订单状态', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeCleaningOrderRow({ status: OrderStatus.IN_SERVICE }),
    );
    await expect(svc.create(baseCreateDto)).rejects.toMatchObject({
      message: expect.stringContaining('IN_SERVICE'),
    });
  });

  it('重复评价同一订单：抛出 BadRequestException', async () => {
    const { svc, prisma } = makeService();
    prisma.review.findFirst = jest.fn().mockResolvedValue({ id: 99 }); // 已存在
    await expect(svc.create(baseCreateDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('重复评价：错误消息包含"重复"', async () => {
    const { svc, prisma } = makeService();
    prisma.review.findFirst = jest.fn().mockResolvedValue({ id: 99 });
    await expect(svc.create(baseCreateDto)).rejects.toMatchObject({
      message: expect.stringContaining('重复'),
    });
  });

  it('CleaningOrder 不存在：抛出 NotFoundException', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.create(baseCreateDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('创建成功：调用 stateMachine.transition 驱动状态至 REVIEWED', async () => {
    const { svc, stateMachine } = makeService();
    await svc.create(baseCreateDto);
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderId: 1,
        orderType: 'CLEANING',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REVIEWED',
        operatorId: 1,
        operatorType: 'RESIDENT',
      }),
    );
  });

  it('不传 images：images 字段为 null', async () => {
    const { svc } = makeService();
    const dto = { ...baseCreateDto };
    delete (dto as Partial<typeof dto>).content;
    const result = await svc.create({ ...baseCreateDto, images: undefined });
    expect(result.images).toBeNull();
  });
});

// ─── 2. findAll ──────────────────────────────────────────────────────────────

describe('ReviewService — findAll（列表查询）', () => {
  it('无筛选：返回分页结构', async () => {
    const { svc } = makeService();
    const result = await svc.findAll({});
    expect(result).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  it('按 orderType 筛选：$transaction 被调用', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ orderType: 'CLEANING' });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('按 orderId + orderType 筛选：$transaction 被调用', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ orderType: 'RECYCLING', orderId: 2 });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('返回 items 数组中的 DTO 结构正确', async () => {
    const { svc } = makeService();
    const result = await svc.findAll({});
    expect(result.items[0]).toMatchObject({
      id: expect.any(Number),
      rating: expect.any(Number),
      tags: expect.any(Array),
      orderType: expect.any(String),
      createdAt: expect.any(String),
    });
  });
});

// ─── 3. findOne ──────────────────────────────────────────────────────────────

describe('ReviewService — findOne（详情查询）', () => {
  it('存在时返回 ReviewDto', async () => {
    const { svc } = makeService();
    const result = await svc.findOne(1);
    expect(result).toMatchObject({
      id: 1,
      rating: 5,
      orderType: 'CLEANING',
    });
  });

  it('createdAt 为 ISO 8601 字符串', async () => {
    const { svc } = makeService();
    const result = await svc.findOne(1);
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.review.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
