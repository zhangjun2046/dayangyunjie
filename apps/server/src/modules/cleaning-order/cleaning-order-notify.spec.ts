import { GeoService } from '../../common/geo/geo.service';
import { CleaningOrderService } from './cleaning-order.service';

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
    id: 1,
    orderNo: 'CLN202609150001',
    residentId: 8,
    workerId: 3,
    worker: { id: 3, name: '李师傅', phone: '13700000003', gender: null, rating: null, totalOrders: 0 },
    workPhotos: [],
    serviceItem: '日常清扫',
    serviceDuration: 2,
    appointDate: new Date('2026-09-16'),
    appointTimeSlot: '14:00',
    addressSnapshot: { detail: '朝阳路1号' },
    contactName: '张三',
    contactPhone: '13800138000',
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
        contactName: '张三',
        contactPhone: '13800138000',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detail: '朝阳路1号',
        buildingInfo: null,
        addressTag: null,
        lat: 39.9,
        lng: 116.4,
        residentId: 8,
      }),
    },
    serviceCatalog: { findFirst: jest.fn().mockResolvedValue({ id: 1, name: '日常清扫' }) },
    worker: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, name: '李师傅', employmentStatus: 'ACTIVE' }),
      update: jest.fn().mockResolvedValue({}),
    },
    cleaningOrder: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(row),
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
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue(row),
    },
  };
  const notify = opts.notify ?? makeNotify();
  const svc = new CleaningOrderService(
    prisma as never,
    { transition: jest.fn().mockResolvedValue('OK') } as never,
    new GeoService(),
    undefined,
    notify as never,
  );
  return { svc, notify, prisma, tx };
}

describe('CleaningOrderService — C5 / C6 通知挂钩', () => {
  it('create 成功后调用 notifyOrderCreated', async () => {
    const { svc, notify } = makeService({});
    await svc.create({
      residentId: 8,
      serviceItem: '日常清扫',
      appointDate: '2026-09-16',
      appointTimeSlot: '14:00',
      addressId: 1,
      contactName: '张三',
      contactPhone: '13800138000',
    });

    expect(notify.notifyOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 1,
        orderType: 'CLEANING',
        orderNo: 'CLN202609150001',
        residentId: 8,
        contactPhone: '13800138000',
        catalogName: '日常清扫',
        appointTimeSlot: '14:00',
      }),
    );
  });

  it('assign / reassign 成功后仅通知新员工', async () => {
    const assigned = makeService({
      row: { status: 'PENDING_ASSIGN', workerId: 3 },
    });
    await assigned.svc.assignOrder(1, { workerId: 3, operatorId: 9 });
    expect(assigned.notify.notifyWorkerAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'CLEANING',
        workerId: 3,
        workerPhone: '13700000003',
        catalogName: '日常清扫',
      }),
    );

    const reassigned = makeService({
      row: { status: 'ASSIGNED', workerId: 3 },
    });
    await reassigned.svc.reassignOrder(1, { workerId: 4, operatorId: 9 });
    expect(reassigned.notify.notifyWorkerAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ orderType: 'CLEANING', workerId: 4 }),
    );
  });

  it('accept 成功后调用 notifyOrderAccepted（接单员工姓名电话）', async () => {
    const { svc, notify } = makeService({
      row: { status: 'ASSIGNED', workerId: 3 },
    });
    await svc.acceptOrder(1, { operatorId: 3 });
    expect(notify.notifyOrderAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'CLEANING',
        workerName: '李师傅',
        workerPhone: '13700000003',
        residentId: 8,
      }),
    );
  });

  it('complete 成功后调用 notifyOrderCompleted', async () => {
    const { svc, notify } = makeService({
      row: { status: 'IN_SERVICE', workerId: 3 },
    });
    await svc.completeOrder(1, {
      operatorId: 3,
      beforePhotoUrls: ['http://x/0.jpg'],
      afterPhotoUrls: ['http://x/1.jpg'],
    });
    expect(notify.notifyOrderCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: 'CLEANING',
        orderNo: 'CLN202609150001',
        residentId: 8,
        catalogName: '日常清扫',
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
      expect.objectContaining({ orderType: 'CLEANING', residentId: 8 }),
    );

    const adminCancel = makeService({ row: { status: 'PENDING_ASSIGN' } });
    await adminCancel.svc.cancelOrder(1, {
      operatorId: 9,
      operatorType: 'ADMIN',
    });
    expect(adminCancel.notify.notifyOrderCancelled).not.toHaveBeenCalled();
  });

  it('通知抛错不阻断派单', async () => {
    const notify = makeNotify();
    notify.notifyWorkerAssigned.mockRejectedValue(new Error('oa down'));
    const { svc } = makeService({ notify, row: { status: 'PENDING_ASSIGN' } });
    await expect(svc.assignOrder(1, { workerId: 3, operatorId: 9 })).resolves.toMatchObject({
      id: 1,
    });
  });
});
