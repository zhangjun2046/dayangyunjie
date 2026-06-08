/**
 * P2.6a 废品回收订单操作接口单元测试
 *
 * 测试矩阵：
 *  1. assignOrder  — 派单（含 workerId 写入、Worker 不存在、非法状态）
 *  2. acceptOrder  — 接单（合法 / 非法状态）
 *  3. gpsCheckin   — GPS签到（正常距离 / 超距 / 无坐标 / 非法状态）
 *  4. completeOrder — 完成服务（照片写入 / 非法状态）
 *  5. cancelOrder  — 取消（合法 / 非法状态）
 *  6. haversineMeters — 距离计算精度（通过 gpsCheckin 间接覆盖）
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PhotoType } from '@prisma/client';
import { RecyclingOrderService } from './recycling-order.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

/**
 * 构造最小可用的数据库行（RecyclingOrder）
 * addressSnapshot 默认含坐标（北京天安门 39.9042, 116.3974）
 */
function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNo: 'RCY202606080001',
    residentId: 1,
    workerId: null,
    itemType: '大件类',
    estimatedWeight: 20,
    actualWeight: null,
    appointDate: new Date('2026-06-08'),
    appointTimeSlot: '09:00-11:00',
    addressSnapshot: {
      name: '测试',
      phone: '13800000000',
      province: '北京',
      city: '北京',
      district: '东城',
      detail: '天安门广场',
      lat: 39.9042,
      lng: 116.3974,
    },
    contactName: '测试用户',
    contactPhone: '13800000000',
    remark: null,
    source: 'MINIPROGRAM',
    isProxyOrder: false,
    proxyName: null,
    proxyPhone: null,
    status: 'PENDING_ASSIGN',
    referenceAmount: null,
    finalAmount: null,
    paymentStatus: 'UNPAID',
    paidAt: null,
    gpsLat: null,
    gpsLng: null,
    gpsCheckinAt: null,
    gpsDistance: null,
    gpsRemark: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** 构造 Prisma 事务 mock，支持 recyclingOrder / worker / workPhoto / orderStatusLog */
function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrderRow()),
      update: jest.fn().mockResolvedValue(makeOrderRow()),
    },
    worker: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
    workPhoto: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
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
    $transaction: jest.fn().mockImplementation((cb: (tx: any) => unknown) => cb(tx)),
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrderRow()),
    },
    _tx: tx,
  };
}

/** 构造 OrderStateMachineService mock */
function makeStateMachineMock(shouldThrow?: string) {
  return {
    transition: jest.fn().mockImplementation(() => {
      if (shouldThrow) throw new BadRequestException(shouldThrow);
      return Promise.resolve('OK');
    }),
  };
}

/** 构造 RecyclingOrderService 实例，注入 mock 依赖 */
function makeService(
  prismaOverrides: Record<string, unknown> = {},
  stateMachineError?: string,
) {
  const prisma = makePrismaMock(prismaOverrides);
  const stateMachine = makeStateMachineMock(stateMachineError);
  // @ts-expect-error — 测试中直接注入 mock，不走 NestJS DI
  const svc = new RecyclingOrderService(prisma, stateMachine);
  return { svc, prisma, stateMachine };
}

// ─── 1. assignOrder ─────────────────────────────────────────────────────────

describe('RecyclingOrderService — assignOrder（派单）', () => {
  const dto = { workerId: 1, operatorId: 10 };

  it('正常派单：写入 workerId 并触发状态机', async () => {
    const { svc, prisma, stateMachine } = makeService();
    await svc.assignOrder(1, dto);

    expect(prisma._tx.recyclingOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ workerId: 1 }) }),
    );
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'ASSIGNED', operatorType: 'ADMIN', orderType: 'RECYCLING' }),
    );
  });

  it('Worker 不存在时抛出 404', async () => {
    const { svc } = makeService({
      worker: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(svc.assignOrder(1, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('订单不存在时抛出 404', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.assignOrder(1, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('状态机拒绝非法转移时向上抛出 400', async () => {
    const { svc } = makeService({}, '非法状态转移：当前状态 ASSIGNED 不允许变更为 ASSIGNED');
    await expect(svc.assignOrder(1, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── 2. acceptOrder ──────────────────────────────────────────────────────────

describe('RecyclingOrderService — acceptOrder（接单）', () => {
  const dto = { operatorId: 2 };

  it('正常接单：状态机以 WORKER 类型被调用，orderType=RECYCLING', async () => {
    const { svc, stateMachine } = makeService();
    await svc.acceptOrder(1, dto);

    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'ACCEPTED', operatorType: 'WORKER', orderType: 'RECYCLING' }),
    );
  });

  it('订单不存在时抛出 404', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.acceptOrder(1, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('状态机拒绝（如当前非 ASSIGNED）时向上抛出 400', async () => {
    const { svc } = makeService({}, '非法状态转移');
    await expect(svc.acceptOrder(1, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── 3. gpsCheckin ───────────────────────────────────────────────────────────

describe('RecyclingOrderService — gpsCheckin（GPS签到）', () => {
  const NEAR_DTO = { lat: 39.9045, lng: 116.3975, operatorId: 2 };
  const FAR_DTO  = { lat: 31.2304, lng: 121.4737, operatorId: 2 };

  it('正常距离（≤ 200m）：gpsRemark 为 null，状态机被调用', async () => {
    const { svc, prisma, stateMachine } = makeService();
    await svc.gpsCheckin(1, NEAR_DTO);

    expect(prisma._tx.recyclingOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gpsLat: NEAR_DTO.lat,
          gpsLng: NEAR_DTO.lng,
          gpsRemark: null,
        }),
      }),
    );
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'IN_SERVICE', operatorType: 'WORKER', orderType: 'RECYCLING' }),
    );
  });

  it('超距（> 200m）：gpsRemark 包含"超距签到"，签到仍然成功', async () => {
    const { svc, prisma } = makeService();
    await svc.gpsCheckin(1, FAR_DTO);

    const updateCall = (prisma._tx.recyclingOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.gpsRemark).toMatch(/超距签到/);
    expect(updateCall.data.gpsDistance).toBeGreaterThan(200);
  });

  it('地址无坐标：跳过距离校验，gpsRemark 含"跳过"', async () => {
    const orderNoCoords = makeOrderRow({
      status: 'ACCEPTED',
      addressSnapshot: { name: '测试', phone: '13800000000', province: '北京', city: '北京', district: '东城', detail: '某处' },
    });
    const prisma = makePrismaMock();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(orderNoCoords);
    const stateMachine = makeStateMachineMock();
    // @ts-expect-error — 测试注入
    const svc = new RecyclingOrderService(prisma, stateMachine);

    await svc.gpsCheckin(1, NEAR_DTO);

    const updateCall = (prisma._tx.recyclingOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.gpsRemark).toMatch(/跳过/);
    expect(updateCall.data.gpsDistance).toBeNull();
  });

  it('remark 在超距时被透传给状态机日志', async () => {
    const { svc, stateMachine } = makeService();
    await svc.gpsCheckin(1, FAR_DTO);

    const transitionCall = (stateMachine.transition as jest.Mock).mock.calls[0][1];
    expect(transitionCall.remark).toMatch(/超距签到/);
  });

  it('订单不存在时抛出 404', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.gpsCheckin(1, NEAR_DTO)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('状态机拒绝（如当前非 ACCEPTED）时向上抛出 400', async () => {
    const { svc } = makeService({}, '非法状态转移');
    await expect(svc.gpsCheckin(1, NEAR_DTO)).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── 4. completeOrder ────────────────────────────────────────────────────────

describe('RecyclingOrderService — completeOrder（完成服务）', () => {
  const dto = {
    photoUrls: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.jpg'],
    operatorId: 2,
  };

  it('正常完成：批量创建 WorkPhoto（recyclingOrderId），状态机被调用', async () => {
    const { svc, prisma, stateMachine } = makeService();
    await svc.completeOrder(1, dto);

    expect(prisma._tx.workPhoto.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          url: dto.photoUrls[0],
          photoType: PhotoType.AFTER,
          orderType: 'RECYCLING',
          recyclingOrderId: 1,
          uploadedBy: 2,
        }),
        expect.objectContaining({
          url: dto.photoUrls[1],
          photoType: PhotoType.AFTER,
          orderType: 'RECYCLING',
          recyclingOrderId: 1,
          uploadedBy: 2,
        }),
      ],
    });
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'PENDING_REVIEW', operatorType: 'WORKER', orderType: 'RECYCLING' }),
    );
  });

  it('照片写入不含 cleaningOrderId（废品专属字段校验）', async () => {
    const { svc, prisma } = makeService();
    await svc.completeOrder(1, { photoUrls: ['https://cdn.example.com/only.jpg'], operatorId: 2 });

    const createCall = (prisma._tx.workPhoto.createMany as jest.Mock).mock.calls[0][0];
    expect(createCall.data[0]).not.toHaveProperty('cleaningOrderId');
    expect(createCall.data[0].recyclingOrderId).toBe(1);
  });

  it('订单不存在时抛出 404', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.completeOrder(1, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('状态机拒绝（如当前非 IN_SERVICE）时向上抛出 400', async () => {
    const { svc } = makeService({}, '非法状态转移');
    await expect(svc.completeOrder(1, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── 5. cancelOrder ──────────────────────────────────────────────────────────

describe('RecyclingOrderService — cancelOrder（取消订单）', () => {
  const residentDto = { operatorId: 1, operatorType: 'RESIDENT' as const, remark: '居民主动取消' };
  const adminDto    = { operatorId: 10, operatorType: 'ADMIN' as const };

  it('居民取消：状态机以 RESIDENT 类型被调用，remark 透传', async () => {
    const { svc, stateMachine } = makeService();
    await svc.cancelOrder(1, residentDto);

    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toStatus: 'CANCELLED',
        operatorType: 'RESIDENT',
        orderType: 'RECYCLING',
        remark: '居民主动取消',
      }),
    );
  });

  it('管理员取消：状态机以 ADMIN 类型被调用', async () => {
    const { svc, stateMachine } = makeService();
    await svc.cancelOrder(1, adminDto);

    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'CANCELLED', operatorType: 'ADMIN', orderType: 'RECYCLING' }),
    );
  });

  it('非 PENDING_ASSIGN 状态下取消：状态机抛出 400', async () => {
    const { svc } = makeService({}, '当前订单状态不允许取消，请联系客服');
    await expect(svc.cancelOrder(1, residentDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('非 PENDING_ASSIGN 状态下取消：错误消息正确', async () => {
    const { svc } = makeService({}, '当前订单状态不允许取消，请联系客服');
    await expect(svc.cancelOrder(1, residentDto)).rejects.toMatchObject({
      message: '当前订单状态不允许取消，请联系客服',
    });
  });

  it('订单不存在时抛出 404', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.cancelOrder(1, residentDto)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 6. Haversine 距离精度（通过 gpsCheckin 间接验证）───────────────────────

describe('haversineMeters — 距离计算精度（通过 gpsCheckin 间接覆盖）', () => {
  async function getGpsDistance(checkinLat: number, checkinLng: number): Promise<number | null> {
    const prisma = makePrismaMock();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({ status: 'ACCEPTED', addressSnapshot: { lat: 39.9042, lng: 116.3974 } }),
    );
    const stateMachine = makeStateMachineMock();
    // @ts-expect-error — 测试注入
    const svc = new RecyclingOrderService(prisma, stateMachine);
    await svc.gpsCheckin(1, { lat: checkinLat, lng: checkinLng, operatorId: 1 });

    const updateCall = (prisma._tx.recyclingOrder.update as jest.Mock).mock.calls[0][0];
    return updateCall.data.gpsDistance as number | null;
  }

  it('同一坐标：距离应 ≈ 0m（< 1m）', async () => {
    const dist = await getGpsDistance(39.9042, 116.3974);
    expect(dist).not.toBeNull();
    expect(dist!).toBeLessThan(1);
  });

  it('约 100m 外：距离 < 200m（不触发超距）', async () => {
    const dist = await getGpsDistance(39.9052, 116.3974);
    expect(dist!).toBeLessThan(200);
    expect(dist!).toBeGreaterThan(50);
  });

  it('上海坐标（约 1100km）：距离 > 1,000,000m', async () => {
    const dist = await getGpsDistance(31.2304, 121.4737);
    expect(dist!).toBeGreaterThan(1_000_000);
  });
});
