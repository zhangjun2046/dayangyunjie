/**
 * P4.4 废品回收订单详情接口单元测试
 *
 * 测试矩阵（与 cleaning-order-p4-4.spec.ts 对称）：
 *  1. findOne — 基础查询（正常 / 404）
 *  2. toDto 映射 — GPS 签到字段
 *  3. toDto 映射 — 代下单字段
 *  4. toDto 映射 — addressSnapshot 透传
 *  5. toDto 映射 — 废品回收特有字段（itemType / estimatedWeight）
 *  6. 状态阻断 — ASSIGNED 不可直接 gpsCheckin
 *  7. 完整签到流程 — acceptOrder → gpsCheckin
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GeoService } from '../../common/geo/geo.service';
import { RecyclingOrderService } from './recycling-order.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

const GPS_CHECKIN_AT = new Date('2026-06-21T10:30:00.000Z');

function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    orderNo: 'RCY20260621P44',
    residentId: 1,
    workerId: 3,
    itemType: '大件类',
    estimatedWeight: 30,
    actualWeight: null,
    appointDate: new Date('2026-06-21'),
    appointTimeSlot: '14:00-16:00',
    addressSnapshot: {
      name: '测试废品',
      phone: '13800000002',
      province: '北京',
      city: '北京',
      district: '朝阳',
      detail: '朝阳门外大街1号',
      lat: 39.9219,
      lng: 116.4434,
    },
    contactName: '王五',
    contactPhone: '13900000002',
    remark: '重物在一楼',
    source: 'MINIPROGRAM',
    isProxyOrder: false,
    serviceContactName: null,
    serviceContactPhone: null,
    status: 'ASSIGNED',
    referenceAmount: null,
    finalAmount: null,
    paymentStatus: 'UNPAID',
    paidAt: null,
    gpsLat: null,
    gpsLng: null,
    gpsCheckinAt: null,
    gpsDistance: null,
    gpsRemark: null,
    createdAt: new Date('2026-06-20T10:00:00.000Z'),
    updatedAt: new Date('2026-06-20T11:00:00.000Z'),
    ...overrides,
  };
}

function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrderRow()),
      update: jest.fn().mockResolvedValue(makeOrderRow()),
    },
    worker: { findUnique: jest.fn().mockResolvedValue({ id: 3 }) },
    workPhoto: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function makePrismaMock(txOverrides: Record<string, unknown> = {}) {
  const tx = makeTxMock(txOverrides);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn().mockImplementation((cb: (tx: any) => unknown) => cb(tx)),
    recyclingOrder: { findUnique: jest.fn().mockResolvedValue(makeOrderRow()) },
    _tx: tx,
  };
}

function makeStateMachineMock(shouldThrow?: string) {
  return {
    transition: jest.fn().mockImplementation(() => {
      if (shouldThrow) throw new BadRequestException(shouldThrow);
      return Promise.resolve('OK');
    }),
  };
}

function makeService(
  prismaOverrides: Record<string, unknown> = {},
  stateMachineError?: string,
) {
  const prisma = makePrismaMock(prismaOverrides);
  const stateMachine = makeStateMachineMock(stateMachineError);
  const geoService = new GeoService();
  // @ts-expect-error — 测试中直接注入 mock，不走 NestJS DI
  const svc = new RecyclingOrderService(prisma, stateMachine, geoService);
  return { svc, prisma, stateMachine };
}

// ─── 1. findOne 基础查询 ──────────────────────────────────────────────────────

describe('RecyclingOrderService — findOne（P4.4 订单详情）', () => {
  it('正常查询：返回 DTO，orderNo 与 DB 一致', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);
    expect(dto.orderNo).toBe('RCY20260621P44');
  });

  it('订单不存在时抛出 NotFoundException', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findOne(2)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 2. toDto 映射 — GPS 签到字段 ─────────────────────────────────────────────

describe('RecyclingOrderService — findOne toDto GPS 字段映射', () => {
  it('GPS 未签到时所有 GPS 字段均为 null', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);

    expect(dto.gpsLat).toBeNull();
    expect(dto.gpsLng).toBeNull();
    expect(dto.gpsCheckinAt).toBeNull();
    expect(dto.gpsDistance).toBeNull();
    expect(dto.gpsRemark).toBeNull();
  });

  it('GPS 已签到（正常距离）：各字段有值，gpsRemark 为 null', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'IN_SERVICE',
        gpsLat: 39.9222,
        gpsLng: 116.4436,
        gpsCheckinAt: GPS_CHECKIN_AT,
        gpsDistance: 42,
        gpsRemark: null,
      }),
    );

    const dto = await svc.findOne(2);

    expect(dto.gpsLat).toBe(39.9222);
    expect(dto.gpsLng).toBe(116.4436);
    expect(dto.gpsCheckinAt).toBe(GPS_CHECKIN_AT.toISOString());
    expect(dto.gpsDistance).toBe(42);
    expect(dto.gpsRemark).toBeNull();
  });

  it('GPS 超距签到：gpsRemark 非空，gpsDistance > 200', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'IN_SERVICE',
        gpsLat: 31.2304,
        gpsLng: 121.4737,
        gpsCheckinAt: GPS_CHECKIN_AT,
        gpsDistance: 1120000,
        gpsRemark: '超距签到，距离 1120000m',
      }),
    );

    const dto = await svc.findOne(2);

    expect(dto.gpsRemark).toMatch(/超距签到/);
    expect(dto.gpsDistance).toBeGreaterThan(200);
  });
});

// ─── 3. toDto 映射 — 代下单字段 ───────────────────────────────────────────────

describe('RecyclingOrderService — findOne toDto 代下单字段映射', () => {
  it('普通订单：isProxyOrder=false，serviceContactName/Phone 为 null', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);

    expect(dto.isProxyOrder).toBe(false);
    expect(dto.serviceContactName).toBeNull();
    expect(dto.serviceContactPhone).toBeNull();
  });

  it('代下单订单：isProxyOrder=true，被服务人姓名与电话正确返回', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        isProxyOrder: true,
        serviceContactName: '赵阿婆',
        serviceContactPhone: '13700002222',
      }),
    );

    const dto = await svc.findOne(2);

    expect(dto.isProxyOrder).toBe(true);
    expect(dto.serviceContactName).toBe('赵阿婆');
    expect(dto.serviceContactPhone).toBe('13700002222');
  });

  it('代下单订单：contactName 为下单联系人，与 serviceContactName 不同', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        contactName: '王五',
        isProxyOrder: true,
        serviceContactName: '赵阿婆',
      }),
    );

    const dto = await svc.findOne(2);

    expect(dto.contactName).toBe('王五');
    expect(dto.serviceContactName).toBe('赵阿婆');
    expect(dto.contactName).not.toBe(dto.serviceContactName);
  });
});

// ─── 4. toDto 映射 — addressSnapshot 透传 ───────────────────────────────────

describe('RecyclingOrderService — findOne toDto addressSnapshot', () => {
  it('含经纬度的 addressSnapshot 完整透传到 DTO', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);

    const snap = dto.addressSnapshot as unknown as Record<string, unknown>;
    expect(snap).toBeTruthy();
    expect(snap.province).toBe('北京');
    expect(snap.district).toBe('朝阳');
    expect(snap.lat).toBe(39.9219);
    expect(snap.lng).toBe(116.4434);
  });
});

// ─── 5. toDto 映射 — 废品回收特有字段 ────────────────────────────────────────

describe('RecyclingOrderService — findOne toDto 废品回收特有字段', () => {
  it('serviceItem 映射自 itemType', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);
    expect(dto.serviceItem).toBe('大件类');
  });

  it('estimatedWeight 正确返回', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);
    expect(dto.estimatedWeight).toBe(30);
  });

  it('status 字段映射为 ASSIGNED 字符串', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(2);
    expect(dto.status).toBe('ASSIGNED');
  });
});

// ─── 6. 状态阻断 — ASSIGNED 不可直接 gpsCheckin ──────────────────────────────

describe('RecyclingOrderService — P4.4 状态阻断', () => {
  it('ASSIGNED 状态下 gpsCheckin 被状态机拒绝', async () => {
    const { svc } = makeService(
      {},
      '非法状态转移：当前状态 ASSIGNED 不允许变更为 IN_SERVICE',
    );

    await expect(
      svc.gpsCheckin(2, { lat: 39.9222, lng: 116.4436, operatorId: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── 7. 完整签到流程 — acceptOrder → gpsCheckin ───────────────────────────────

describe('RecyclingOrderService — P4.4 完整签到流程', () => {
  it('acceptOrder 调用状态机 toStatus=ACCEPTED，operatorType=WORKER', async () => {
    const { svc, stateMachine } = makeService();
    await svc.acceptOrder(2, { operatorId: 3 });

    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'ACCEPTED', operatorType: 'WORKER' }),
    );
  });

  it('gpsCheckin（正常距离）：GPS 字段写入 DB，状态机触发 IN_SERVICE', async () => {
    const { svc, prisma, stateMachine } = makeService();
    const dto = { lat: 39.9222, lng: 116.4436, operatorId: 3 };
    await svc.gpsCheckin(2, dto);

    expect(prisma._tx.recyclingOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gpsLat: dto.lat,
          gpsLng: dto.lng,
          gpsRemark: null,
        }),
      }),
    );
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'IN_SERVICE', operatorType: 'WORKER' }),
    );
  });

  it('gpsCheckin（超距）：gpsRemark 含"超距签到"，签到仍然成功', async () => {
    const { svc, prisma } = makeService();
    await svc.gpsCheckin(2, { lat: 31.2304, lng: 121.4737, operatorId: 3 });

    const updateCall = (prisma._tx.recyclingOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.gpsRemark).toMatch(/超距签到/);
    expect(updateCall.data.gpsDistance).toBeGreaterThan(200);
  });

  it('代下单订单 gpsCheckin：不影响签到流程', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'ACCEPTED',
        isProxyOrder: true,
        serviceContactName: '赵阿婆',
        serviceContactPhone: '13700002222',
      }),
    );

    await expect(
      svc.gpsCheckin(2, { lat: 39.9222, lng: 116.4436, operatorId: 3 }),
    ).resolves.not.toThrow();
  });
});
