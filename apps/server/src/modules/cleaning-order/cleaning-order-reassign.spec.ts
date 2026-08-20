import { BadRequestException } from '@nestjs/common';
import { CleaningOrderService } from './cleaning-order.service';

function makeOrder(status = 'ASSIGNED') {
  return {
    id: 1,
    orderNo: 'CLN202608200001',
    residentId: 1,
    workerId: 2,
    worker: { id: 2, name: '张师傅', phone: '13800000000', gender: null },
    workPhotos: [],
    status,
    serviceItem: '深度保洁',
    serviceDuration: 2,
    appointDate: new Date('2026-08-21'),
    appointTimeSlot: '09:00',
    addressSnapshot: {},
    contactName: '居民',
    contactPhone: '13900000000',
    remark: null,
    source: 'ADMIN',
    isProxyOrder: false,
    serviceContactName: null,
    serviceContactPhone: null,
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
  };
}

function makeService(status = 'ASSIGNED', updateCount = 1) {
  const tx = {
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue({
        status,
        workerId: 2,
        worker: { name: '张师傅' },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
    },
    worker: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, name: '李师傅' }),
    },
    orderStatusLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue(makeOrder()),
    },
  };
  const service = new CleaningOrderService(
    prisma as never,
    {} as never,
    {} as never,
  );
  return { service, tx };
}

describe('CleaningOrderService reassignOrder', () => {
  const dto = { workerId: 3, operatorId: 9 };

  it('仅更换 ASSIGNED 订单员工并写同状态改派日志', async () => {
    const { service, tx } = makeService();
    await service.reassignOrder(1, dto);

    expect(tx.cleaningOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'ASSIGNED', workerId: 2 },
      data: { workerId: 3 },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'ASSIGNED',
        toStatus: 'ASSIGNED',
        remark: '服务人员由张师傅变更为李师傅（管理员改派）',
      }),
    });
  });

  it('员工已接单后禁止改派', async () => {
    const { service } = makeService('ACCEPTED');
    await expect(service.reassignOrder(1, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('接单竞态导致条件更新失败时拒绝改派', async () => {
    const { service } = makeService('ASSIGNED', 0);
    await expect(service.reassignOrder(1, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
