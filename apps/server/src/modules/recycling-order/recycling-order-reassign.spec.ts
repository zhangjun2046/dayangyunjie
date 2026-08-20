import { BadRequestException } from '@nestjs/common';
import { RecyclingOrderService } from './recycling-order.service';

function makeService(status = 'ASSIGNED') {
  const tx = {
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue({
        status,
        workerId: 2,
        worker: { name: '张师傅' },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        orderNo: 'RCY202608200001',
        residentId: 1,
        workerId: 3,
        worker: { id: 3, name: '李师傅', phone: '13800000000', gender: null },
        workPhotos: [],
        status: 'ASSIGNED',
        itemType: '纸品',
        estimatedWeight: 5,
        actualWeight: null,
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
      }),
    },
  };
  const service = new RecyclingOrderService(
    prisma as never,
    {} as never,
    {} as never,
  );
  return { service, tx };
}

describe('RecyclingOrderService reassignOrder', () => {
  it('ASSIGNED 废品订单可同状态改派', async () => {
    const { service, tx } = makeService();
    await service.reassignOrder(1, { workerId: 3, operatorId: 9 });

    expect(tx.recyclingOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'ASSIGNED', workerId: 2 },
      data: { workerId: 3 },
    });
    expect(tx.orderStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'ASSIGNED',
        toStatus: 'ASSIGNED',
      }),
    });
  });

  it('ACCEPTED 废品订单禁止改派', async () => {
    const { service } = makeService('ACCEPTED');
    await expect(
      service.reassignOrder(1, { workerId: 3, operatorId: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
