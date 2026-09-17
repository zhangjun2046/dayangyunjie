import { GeoService } from '../../common/geo/geo.service';
import { RecyclingOrderService } from './recycling-order.service';

function makeNotify() {
  return {
    notifyOrderCreated: jest.fn().mockResolvedValue(undefined),
    notifyWorkerAssigned: jest.fn().mockResolvedValue(undefined),
    notifyOrderAccepted: jest.fn().mockResolvedValue(undefined),
    notifyOrderCompleted: jest.fn().mockResolvedValue(undefined),
    notifyOrderCancelled: jest.fn().mockResolvedValue(undefined),
  };
}

function makeOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    orderNo: 'RCY202609150001',
    residentId: 8,
    workerId: 3,
    worker: { id: 3, name: '王师傅', phone: '13700000005', gender: null, rating: null, totalOrders: 0 },
    workPhotos: [],
    itemType: '小件类废品',
    estimatedWeight: 10,
    actualWeight: null,
    selectedItems: null,
    hasElevator: null,
    carryFloor: null,
    itemPhotoUrl: null,
    appointDate: new Date('2026-09-16'),
    appointTimeSlot: '10:00',
    addressSnapshot: { detail: '回收路2号' },
    contactName: '李四',
    contactPhone: '13900139000',
    remark: null,
    source: 'MINIPROGRAM',
    isProxyOrder: false,
    serviceContactName: null,
    serviceContactPhone: null,
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
    createdAt: new Date('2026-09-15T00:00:00Z'),
    updatedAt: new Date('2026-09-15T00:00:00Z'),
    ...overrides,
  };
}

function makeService(opts: {
  notify?: ReturnType<typeof makeNotify>;
  tx?: Record<string, unknown>;
  row?: Record<string, unknown>;
}) {
  const row = makeOrderRow(opts.row);
  const tx = {
    resident: { findUnique: jest.fn().mockResolvedValue({ id: 8 }) },
    address: {
      findUnique: jest.fn().mockResolvedValue({
        contactName: '李四',
        contactPhone: '13900139000',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detail: '回收路2号',
        buildingInfo: null,
        addressTag: null,
        lat: 39.9,
        lng: 116.4,
        residentId: 8,
      }),
    },
    recyclingItem: { findMany: jest.fn().mockResolvedValue([]) },
    worker: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, name: '王师傅', employmentStatus: 'ACTIVE' }),
      update: jest.fn().mockResolvedValue({}),
    },
    recyclingOrder: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        status: row.status,
        workerId: 3,
        worker: { name: '旧师傅' },
      }),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
    workPhoto: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ...opts.tx,
  };
  const prisma = {
    $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue(row),
    },
  };
  const notify = opts.notify ?? makeNotify();
  const svc = new RecyclingOrderService(
    prisma as never,
    { transition: jest.fn().mockResolvedValue('OK') } as never,
    new GeoService(),
    undefined,
    notify as never,
  );
  return { svc, notify };
}

describe('RecyclingOrderService — C5 / C6 通知挂钩', () => {
  it('create 成功后调用 notifyOrderCreated（catalogName=品类）', async () => {
    const { svc, notify } = makeService({});
    await svc.create({
      residentId: 8,
      serviceItem: '小件类废品',
      estimatedWeight: 10,
      appointDate: '2026-09-16',
      appointTimeSlot: '10:00',
      addressId: 1,
      contactName: '李四',
      contactPhone: '13900139000',
    });

    expect(notify.notifyOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 2,
        orderType: 'RECYCLING',
        catalogName: '小件类废品',
        residentId: 8,
        contactPhone: '13900139000',
      }),
    );
  });

  it('assign / reassign 成功后仅通知新员工', async () => {
    const assigned = makeService({ row: { status: 'PENDING_ASSIGN', workerId: 3 } });
    await assigned.svc.assignOrder(1, { workerId: 3, operatorId: 9 });
    expect(assigned.notify.notifyWorkerAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'RECYCLING',
        workerId: 3,
        workerPhone: '13700000005',
        catalogName: '小件类废品',
      }),
    );

    const reassigned = makeService({ row: { status: 'ASSIGNED', workerId: 3 } });
    await reassigned.svc.reassignOrder(1, { workerId: 4, operatorId: 9 });
    expect(reassigned.notify.notifyWorkerAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ orderType: 'RECYCLING', workerId: 4 }),
    );
  });

  it('accept 成功后调用 notifyOrderAccepted', async () => {
    const { svc, notify } = makeService({ row: { status: 'ASSIGNED', workerId: 3 } });
    await svc.acceptOrder(1, { operatorId: 3 });
    expect(notify.notifyOrderAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'RECYCLING',
        workerName: '王师傅',
        workerPhone: '13700000005',
      }),
    );
  });

  it('complete 成功后调用 notifyOrderCompleted', async () => {
    const { svc, notify } = makeService({ row: { status: 'IN_SERVICE', workerId: 3 } });
    await svc.completeOrder(1, {
      operatorId: 3,
      beforePhotoUrls: ['http://x/0.jpg'],
      afterPhotoUrls: ['http://x/1.jpg'],
    });
    expect(notify.notifyOrderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'RECYCLING',
        catalogName: '小件类废品',
        residentId: 8,
      }),
    );
  });

  it('居民取消调用 notifyOrderCancelled，运营取消不调用', async () => {
    const residentCancel = makeService({ row: { status: 'PENDING_ASSIGN' } });
    await residentCancel.svc.cancelOrder(1, {
      operatorId: 8,
      operatorType: 'RESIDENT',
    });
    expect(residentCancel.notify.notifyOrderCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ orderType: 'RECYCLING', residentId: 8 }),
    );

    const adminCancel = makeService({ row: { status: 'PENDING_ASSIGN' } });
    await adminCancel.svc.cancelOrder(1, {
      operatorId: 9,
      operatorType: 'ADMIN',
    });
    expect(adminCancel.notify.notifyOrderCancelled).not.toHaveBeenCalled();
  });
});
