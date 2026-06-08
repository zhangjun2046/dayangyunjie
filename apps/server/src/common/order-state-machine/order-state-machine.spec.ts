/**
 * P2.5b 状态机单元测试（2026-06-08 更新：§8.4/§8.5 废品无验收节点）
 *
 * 测试矩阵：
 *  1. CLEANING 合法转移 ×6
 *  2. RECYCLING 合法转移 ×6（与 CLEANING 完全一致，无 PENDING_ACCEPTANCE）
 *  3. 终态保护（REVIEWED / CANCELLED 不可再转移）
 *  4. 取消专项（仅 PENDING_ASSIGN 可取消，其余返回专用提示）
 *  5. 其他非法转移（如跳步、逆向；RECYCLING 中 PENDING_ACCEPTANCE 亦为非法）
 *  6. transition() 原子操作：数据库写入验证（mock Prisma tx）
 */

import { BadRequestException } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';

// ─── 测试辅助 ───────────────────────────────────────────────────

function makeService(): OrderStateMachineService {
  return new OrderStateMachineService();
}

/** 构造最小可用的 Prisma 事务 mock */
function makeTxMock() {
  return {
    cleaningOrder: {
      update: jest.fn().mockResolvedValue({}),
    },
    recyclingOrder: {
      update: jest.fn().mockResolvedValue({}),
    },
    orderStatusLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

// ─── 1. CLEANING 合法转移 ────────────────────────────────────────

describe('OrderStateMachineService — CLEANING 合法转移', () => {
  const svc = makeService();

  const legalTransitions: Array<[string, string]> = [
    ['PENDING_ASSIGN', 'ASSIGNED'],
    ['PENDING_ASSIGN', 'CANCELLED'],
    ['ASSIGNED', 'ACCEPTED'],
    ['ACCEPTED', 'IN_SERVICE'],
    ['IN_SERVICE', 'PENDING_REVIEW'],
    ['PENDING_REVIEW', 'REVIEWED'],
  ];

  test.each(legalTransitions)(
    '%s → %s 应通过校验',
    (from, to) => {
      expect(() => svc.validateTransition('CLEANING', from, to)).not.toThrow();
    },
  );
});

// ─── 2. RECYCLING 合法转移 ───────────────────────────────────────

describe('OrderStateMachineService — RECYCLING 合法转移', () => {
  const svc = makeService();

  const legalTransitions: Array<[string, string]> = [
    ['PENDING_ASSIGN', 'ASSIGNED'],
    ['PENDING_ASSIGN', 'CANCELLED'],
    ['ASSIGNED', 'ACCEPTED'],
    ['ACCEPTED', 'IN_SERVICE'],
    ['IN_SERVICE', 'PENDING_REVIEW'],
    ['PENDING_REVIEW', 'REVIEWED'],
  ];

  test.each(legalTransitions)(
    '%s → %s 应通过校验',
    (from, to) => {
      expect(() => svc.validateTransition('RECYCLING', from, to)).not.toThrow();
    },
  );
});

// ─── 3. 终态保护 ─────────────────────────────────────────────────

describe('OrderStateMachineService — 终态保护', () => {
  const svc = makeService();

  test('REVIEWED 不可再转移（→ PENDING_ASSIGN）', () => {
    expect(() => svc.validateTransition('CLEANING', 'REVIEWED', 'PENDING_ASSIGN'))
      .toThrow(BadRequestException);
  });

  test('REVIEWED 不可再转移（→ CANCELLED）', () => {
    expect(() => svc.validateTransition('CLEANING', 'REVIEWED', 'CANCELLED'))
      .toThrow(BadRequestException);
  });

  test('CANCELLED 不可再转移（→ ASSIGNED）', () => {
    expect(() => svc.validateTransition('CLEANING', 'CANCELLED', 'ASSIGNED'))
      .toThrow(BadRequestException);
  });

  test('终态错误信息包含"终态"关键词', () => {
    expect(() => svc.validateTransition('CLEANING', 'REVIEWED', 'ASSIGNED'))
      .toThrow(/终态/);
  });
});

// ─── 4. 取消专项规则 ─────────────────────────────────────────────

describe('OrderStateMachineService — 取消专项规则', () => {
  const svc = makeService();

  const nonCancellableStatuses = [
    'ASSIGNED',
    'ACCEPTED',
    'IN_SERVICE',
    'PENDING_REVIEW',
  ];

  test.each(nonCancellableStatuses)(
    '从 %s 取消应返回专用提示',
    (from) => {
      expect(() => svc.validateTransition('CLEANING', from, 'CANCELLED'))
        .toThrow('当前订单状态不允许取消，请联系客服');
    },
  );

  test('PENDING_ASSIGN → CANCELLED 合法（居民主动取消）', () => {
    expect(() => svc.validateTransition('CLEANING', 'PENDING_ASSIGN', 'CANCELLED'))
      .not.toThrow();
  });
});

// ─── 5. 其他非法转移 ─────────────────────────────────────────────

describe('OrderStateMachineService — 其他非法转移', () => {
  const svc = makeService();

  const illegalTransitions: Array<[string, string, string]> = [
    // 跳步
    ['PENDING_ASSIGN', 'ACCEPTED', 'CLEANING'],
    ['PENDING_ASSIGN', 'IN_SERVICE', 'CLEANING'],
    ['ASSIGNED', 'IN_SERVICE', 'CLEANING'],
    // 逆向
    ['ACCEPTED', 'ASSIGNED', 'CLEANING'],
    ['IN_SERVICE', 'ACCEPTED', 'CLEANING'],
    ['PENDING_REVIEW', 'IN_SERVICE', 'CLEANING'],
    // RECYCLING 中 PENDING_ACCEPTANCE 已取消（§8.5），直接跳过是非法的（应走 IN_SERVICE→PENDING_REVIEW）
    ['IN_SERVICE', 'PENDING_ACCEPTANCE', 'RECYCLING'],
    // CLEANING 中同样不存在 PENDING_ACCEPTANCE
    ['IN_SERVICE', 'PENDING_ACCEPTANCE', 'CLEANING'],
  ];

  test.each(illegalTransitions)(
    '%s → %s (%s) 应抛出 BadRequestException',
    (from, to, orderType) => {
      expect(() =>
        svc.validateTransition(orderType as 'CLEANING' | 'RECYCLING', from, to),
      ).toThrow(BadRequestException);
    },
  );

  test('非法转移错误信息包含当前状态和目标状态', () => {
    expect(() => svc.validateTransition('CLEANING', 'ASSIGNED', 'PENDING_REVIEW'))
      .toThrow(/ASSIGNED.*PENDING_REVIEW|PENDING_REVIEW.*ASSIGNED/);
  });
});

// ─── 6. transition() 原子操作（mock tx） ─────────────────────────

describe('OrderStateMachineService — transition() 原子操作', () => {
  let svc: OrderStateMachineService;

  beforeEach(() => {
    svc = makeService();
  });

  test('合法转移：更新 cleaningOrder status 并写入 orderStatusLog', async () => {
    const tx = makeTxMock();

    const result = await svc.transition(tx as any, {
      orderId: 1,
      orderType: 'CLEANING',
      fromStatus: 'PENDING_ASSIGN',
      toStatus: 'ASSIGNED',
      operatorId: 10,
      operatorType: 'ADMIN',
    });

    expect(result).toBe('ASSIGNED');
    expect(tx.cleaningOrder.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'ASSIGNED' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 1,
        orderType: 'CLEANING',
        fromStatus: 'PENDING_ASSIGN',
        toStatus: 'ASSIGNED',
        operatorId: 10,
        operatorType: 'ADMIN',
        remark: null,
      }),
    });
  });

  test('合法转移：RECYCLING IN_SERVICE → PENDING_REVIEW（无 PENDING_ACCEPTANCE）', async () => {
    const tx = makeTxMock();

    await svc.transition(tx as any, {
      orderId: 2,
      orderType: 'RECYCLING',
      fromStatus: 'IN_SERVICE',
      toStatus: 'PENDING_REVIEW',
      operatorId: 5,
      operatorType: 'WORKER',
      remark: '上传照片完成',
    });

    expect(tx.recyclingOrder.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { status: 'PENDING_REVIEW' },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        remark: '上传照片完成',
      }),
    });
  });

  test('非法转移：抛出 BadRequestException，不调用数据库方法', async () => {
    const tx = makeTxMock();

    await expect(
      svc.transition(tx as any, {
        orderId: 1,
        orderType: 'CLEANING',
        fromStatus: 'ACCEPTED',
        toStatus: 'CANCELLED',
        operatorId: 1,
        operatorType: 'RESIDENT',
      }),
    ).rejects.toThrow('当前订单状态不允许取消，请联系客服');

    expect(tx.cleaningOrder.update).not.toHaveBeenCalled();
    expect(tx.orderStatusLog.create).not.toHaveBeenCalled();
  });

  test('取消操作携带 remark 正确写入', async () => {
    const tx = makeTxMock();

    await svc.transition(tx as any, {
      orderId: 3,
      orderType: 'CLEANING',
      fromStatus: 'PENDING_ASSIGN',
      toStatus: 'CANCELLED',
      operatorId: 7,
      operatorType: 'RESIDENT',
      remark: '计划有变，主动取消',
    });

    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toStatus: 'CANCELLED',
        remark: '计划有变，主动取消',
      }),
    });
  });
});
