/**
 * P4.4 保洁订单详情接口单元测试
 *
 * 测试矩阵：
 *  1. findOne — 基础查询（正常 / 订单不存在 404）
 *  2. toDto 映射 — GPS 签到字段（gpsLat/gpsLng/gpsCheckinAt/gpsDistance/gpsRemark）
 *  3. toDto 映射 — 代下单字段（isProxyOrder/serviceContactName/serviceContactPhone）
 *  4. toDto 映射 — addressSnapshot 透传
 *  5. toDto 映射 — GPS 未签到时所有 GPS 字段为 null
 *  6. 完整状态流程 — ASSIGNED 不可直接 gpsCheckin（须先 acceptOrder）
 *  7. 完整状态流程 — ASSIGNED → acceptOrder → ACCEPTED → gpsCheckin → IN_SERVICE
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GeoService } from '../../common/geo/geo.service';
import { CleaningOrderService } from './cleaning-order.service';

// ─── Mock 工厂（复用 p2-5c 风格）────────────────────────────────────────────

const GPS_CHECKIN_AT = new Date('2026-06-21T10:00:00.000Z');

function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNo: 'CLN20260621P44',
    residentId: 1,
    workerId: 2,
    serviceItem: '标准保洁',
    serviceDuration: 2,
    appointDate: new Date('2026-06-21'),
    appointTimeSlot: '10:00-12:00',
    addressSnapshot: {
      name: '测试',
      phone: '13800000000',
      province: '北京',
      city: '北京',
      district: '东城',
      detail: '天安门广场1号',
      lat: 39.9042,
      lng: 116.3974,
    },
    contactName: '张三',
    contactPhone: '13900000001',
    remark: '请轻敲门铃',
    notes: null,
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
    createdAt: new Date('2026-06-20T08:00:00.000Z'),
    updatedAt: new Date('2026-06-20T09:00:00.000Z'),
    ...overrides,
  };
}

function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrderRow()),
      update: jest.fn().mockResolvedValue(makeOrderRow()),
    },
    worker: { findUnique: jest.fn().mockResolvedValue({ id: 2 }) },
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
    cleaningOrder: { findUnique: jest.fn().mockResolvedValue(makeOrderRow()) },
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
  const svc = new CleaningOrderService(prisma, stateMachine, geoService);
  return { svc, prisma, stateMachine };
}

// ─── 1. findOne 基础查询 ──────────────────────────────────────────────────────

describe('CleaningOrderService — findOne（P4.4 订单详情）', () => {
  it('正常查询：返回 DTO，orderNo 与 DB 一致', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);
    expect(dto.orderNo).toBe('CLN20260621P44');
  });

  it('订单不存在时抛出 NotFoundException', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 2. toDto 映射 — GPS 签到字段 ─────────────────────────────────────────────

describe('CleaningOrderService — findOne toDto GPS 字段映射', () => {
  it('GPS 未签到时所有 GPS 字段均为 null', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    expect(dto.gpsLat).toBeNull();
    expect(dto.gpsLng).toBeNull();
    expect(dto.gpsCheckinAt).toBeNull();
    expect(dto.gpsDistance).toBeNull();
    expect(dto.gpsRemark).toBeNull();
  });

  it('GPS 已签到（正常距离）：gpsLat/gpsLng/gpsCheckinAt/gpsDistance 有值，gpsRemark 为 null', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'IN_SERVICE',
        gpsLat: 39.9045,
        gpsLng: 116.3975,
        gpsCheckinAt: GPS_CHECKIN_AT,
        gpsDistance: 35,
        gpsRemark: null,
      }),
    );

    const dto = await svc.findOne(1);

    expect(dto.gpsLat).toBe(39.9045);
    expect(dto.gpsLng).toBe(116.3975);
    expect(dto.gpsCheckinAt).toBe(GPS_CHECKIN_AT.toISOString());
    expect(dto.gpsDistance).toBe(35);
    expect(dto.gpsRemark).toBeNull();
  });

  it('GPS 超距签到：gpsRemark 含"超距签到"，gpsDistance > 200', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'IN_SERVICE',
        gpsLat: 31.2304,
        gpsLng: 121.4737,
        gpsCheckinAt: GPS_CHECKIN_AT,
        gpsDistance: 1120000,
        gpsRemark: '超距签到，距离 1120000m',
      }),
    );

    const dto = await svc.findOne(1);

    expect(dto.gpsRemark).toMatch(/超距签到/);
    expect(dto.gpsDistance).toBeGreaterThan(200);
  });
});

// ─── 3. toDto 映射 — 代下单字段 ───────────────────────────────────────────────

describe('CleaningOrderService — findOne toDto 代下单字段映射', () => {
  it('普通订单：isProxyOrder=false，serviceContactName/Phone 为 null', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    expect(dto.isProxyOrder).toBe(false);
    expect(dto.serviceContactName).toBeNull();
    expect(dto.serviceContactPhone).toBeNull();
  });

  it('代下单订单：isProxyOrder=true，被服务人姓名与电话正确返回', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        isProxyOrder: true,
        serviceContactName: '李阿姨',
        serviceContactPhone: '13800001111',
      }),
    );

    const dto = await svc.findOne(1);

    expect(dto.isProxyOrder).toBe(true);
    expect(dto.serviceContactName).toBe('李阿姨');
    expect(dto.serviceContactPhone).toBe('13800001111');
  });

  it('代下单订单：contactName 仍返回下单联系人（非被服务人）', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        contactName: '张三',
        isProxyOrder: true,
        serviceContactName: '李阿姨',
        serviceContactPhone: '13800001111',
      }),
    );

    const dto = await svc.findOne(1);

    // 下单联系人与被服务人是不同的人
    expect(dto.contactName).toBe('张三');
    expect(dto.serviceContactName).toBe('李阿姨');
  });
});

// ─── 4. toDto 映射 — addressSnapshot 透传 ───────────────────────────────────

describe('CleaningOrderService — findOne toDto addressSnapshot', () => {
  it('含经纬度的 addressSnapshot 完整透传到 DTO', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    const snap = dto.addressSnapshot as unknown as Record<string, unknown>;
    expect(snap).toBeTruthy();
    expect(snap.province).toBe('北京');
    expect(snap.detail).toBe('天安门广场1号');
    expect(snap.lat).toBe(39.9042);
    expect(snap.lng).toBe(116.3974);
  });

  it('不含经纬度的 addressSnapshot 也能透传（后端不强制要求坐标）', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        addressSnapshot: { province: '上海', city: '上海', district: '浦东', detail: '某处' },
      }),
    );

    const dto = await svc.findOne(1);
    const snap = dto.addressSnapshot as unknown as Record<string, unknown>;

    expect(snap.province).toBe('上海');
    expect(snap.lat).toBeUndefined();
    expect(snap.lng).toBeUndefined();
  });
});

// ─── 5. toDto 映射 — 基础订单元数据 ──────────────────────────────────────────

describe('CleaningOrderService — findOne toDto 订单元数据', () => {
  it('serviceItem / serviceDuration / contactName / contactPhone 正确映射', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    expect(dto.serviceItem).toBe('标准保洁');
    expect(dto.serviceDuration).toBe(2);
    expect(dto.contactName).toBe('张三');
    expect(dto.contactPhone).toBe('13900000001');
  });

  it('createdAt 以 ISO 字符串形式返回', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    expect(dto.createdAt).toBe(new Date('2026-06-20T08:00:00.000Z').toISOString());
  });

  it('status 字段正确映射为字符串枚举', async () => {
    const { svc } = makeService();
    const dto = await svc.findOne(1);

    expect(dto.status).toBe('ASSIGNED');
  });
});

// ─── 6. 状态流程 — ASSIGNED 阻断 gpsCheckin ──────────────────────────────────

describe('CleaningOrderService — P4.4 状态阻断', () => {
  it('ASSIGNED 状态下 gpsCheckin 被状态机拒绝（须先 acceptOrder）', async () => {
    const { svc } = makeService(
      {},
      '非法状态转移：当前状态 ASSIGNED 不允许变更为 IN_SERVICE',
    );

    await expect(
      svc.gpsCheckin(1, { lat: 39.9045, lng: 116.3975, operatorId: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ASSIGNED 状态下 gpsCheckin 拒绝时错误消息可识别', async () => {
    const { svc } = makeService(
      {},
      '非法状态转移：当前状态 ASSIGNED 不允许变更为 IN_SERVICE',
    );

    await expect(
      svc.gpsCheckin(1, { lat: 39.9045, lng: 116.3975, operatorId: 2 }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('非法状态转移'),
    });
  });
});

// ─── 7. 完整流程 — ASSIGNED → acceptOrder → gpsCheckin → IN_SERVICE ────────

describe('CleaningOrderService — P4.4 完整签到流程', () => {
  it('Step1: acceptOrder 调用状态机 toStatus=ACCEPTED，operatorType=WORKER', async () => {
    const { svc, stateMachine } = makeService();
    await svc.acceptOrder(1, { operatorId: 2 });

    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'ACCEPTED', operatorType: 'WORKER' }),
    );
  });

  it('Step2: gpsCheckin（正常距离）调用状态机 toStatus=IN_SERVICE，GPS 字段写入 DB', async () => {
    const { svc, prisma, stateMachine } = makeService();
    const dto = { lat: 39.9045, lng: 116.3975, operatorId: 2 };
    await svc.gpsCheckin(1, dto);

    // 验证 GPS 坐标写入 DB
    expect(prisma._tx.cleaningOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gpsLat: dto.lat,
          gpsLng: dto.lng,
          gpsRemark: null,
        }),
      }),
    );

    // 验证状态机触发 IN_SERVICE
    expect(stateMachine.transition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toStatus: 'IN_SERVICE', operatorType: 'WORKER' }),
    );
  });

  it('Step2（超距）: gpsCheckin 仍然成功，gpsRemark 和状态机 remark 均含"超距签到"', async () => {
    const { svc, prisma, stateMachine } = makeService();
    await svc.gpsCheckin(1, { lat: 31.2304, lng: 121.4737, operatorId: 2 });

    const updateCall = (prisma._tx.cleaningOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.gpsRemark).toMatch(/超距签到/);

    const transitionCall = (stateMachine.transition as jest.Mock).mock.calls[0][1];
    expect(transitionCall.remark).toMatch(/超距签到/);
  });

  it('代下单订单 gpsCheckin：被服务人信息不影响 GPS 签到流程', async () => {
    const { svc, prisma } = makeService();
    // 确保订单是代下单
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(
      makeOrderRow({
        status: 'ACCEPTED',
        isProxyOrder: true,
        serviceContactName: '李阿姨',
        serviceContactPhone: '13800001111',
      }),
    );

    await expect(
      svc.gpsCheckin(1, { lat: 39.9045, lng: 116.3975, operatorId: 2 }),
    ).resolves.not.toThrow();
  });
});
