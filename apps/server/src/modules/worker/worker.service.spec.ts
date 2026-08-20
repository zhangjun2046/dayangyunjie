import { WorkerService } from './worker.service';

describe('WorkerService statistics', () => {
  it('按完成服务日志统计今日完成，并按已接单口径计算完成率', async () => {
    const worker = {
      id: 2,
      employeeNo: 'W002',
      passwordHash: 'hidden',
      name: '张师傅',
      phone: '13800000000',
      nickname: null,
      gender: null,
      idCard: null,
      position: null,
      skillType: 'CLEANING',
      emergencyContact: null,
      emergencyPhone: null,
      avatar: null,
      status: 'IDLE',
      rating: 5,
      totalOrders: 1,
      healthCertUrl: null,
      healthCertExpiry: null,
      skillCertUrl: null,
      skillCertExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      worker: {
        findUnique: jest.fn().mockResolvedValue(worker),
      },
      orderStatusLog: {
        findMany: jest.fn().mockResolvedValue([
          { orderId: 10, orderType: 'CLEANING' },
        ]),
      },
      cleaningOrder: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, workerId: 2, status: 'PENDING_REVIEW' },
          { id: 11, workerId: 2, status: 'IN_SERVICE' },
        ]),
      },
      recyclingOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };

    const service = new WorkerService(prisma as never);
    const result = await service.findOne(2);

    expect(result).toMatchObject({
      todayOrders: 1,
      pendingOrders: 1,
      completedOrders: 1,
      acceptedOrders: 2,
      completionRate: 50,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
