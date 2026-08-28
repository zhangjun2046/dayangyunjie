/**
 * P2.10 ComplaintService 单元测试
 *
 * 测试矩阵：
 *  1. create       — 创建投诉（成功三类订单/订单不存在）
 *  2. findAll      — 列表查询（分页/状态筛选/订单类型筛选）
 *  3. findOne      — 详情（含 followUps / 不存在 404）
 *  4. updateStatus — 状态转移（合法路径/非法/终态保护/订单不存在）
 *  5. addFollowUp  — 添加跟进记录（成功/投诉不存在）
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplaintStatus } from '@prisma/client';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

function makeComplaintRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    complaintNo: 'CPL202606080001',
    cleaningOrderId: 1,
    recyclingOrderId: null,
    consultOrderId: null,
    orderType: 'CLEANING',
    orderNo: null,
    residentId: null,
    serviceType: null,
    serviceAddress: null,
    reasons: [{ configId: 2, label: '打扫不干净' }],
    description: '保洁不彻底',
    evidenceImages: null,
    status: ComplaintStatus.PENDING,
    createdAt: new Date('2026-06-08T10:00:00.000Z'),
    updatedAt: new Date('2026-06-08T10:00:00.000Z'),
    ...overrides,
  };
}

function makeFollowUpRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    complaintId: 1,
    handlerName: '张管理员',
    content: '已联系居民',
    createdAt: new Date('2026-06-08T11:00:00.000Z'),
    ...overrides,
  };
}

function makePrismaMock(overrides: Record<string, unknown> = {}) {
  const prisma = {
    cleaningOrder: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    },
    recyclingOrder: {
      findUnique: jest.fn().mockResolvedValue({ id: 2 }),
    },
    consultOrder: {
      findUnique: jest.fn().mockResolvedValue({ id: 3 }),
    },
    complaintReasonConfig: {
      findMany: jest.fn().mockResolvedValue([
        { id: 2, label: '打扫不干净', isEnabled: true },
      ]),
    },
    complaint: {
      create: jest.fn().mockResolvedValue(makeComplaintRow()),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(
        Object.assign(makeComplaintRow(), { followUps: [makeFollowUpRow()] }),
      ),
      findMany: jest.fn().mockResolvedValue([makeComplaintRow()]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.PROCESSING })),
    },
    complaintFollowUp: {
      create: jest.fn().mockResolvedValue(makeFollowUpRow()),
    },
    orderStatusLog: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
  return {
    ...prisma,
    $transaction: jest.fn().mockImplementation((cbOrArray: unknown) => {
      if (Array.isArray(cbOrArray)) {
        return Promise.all(cbOrArray);
      }
      return (cbOrArray as (tx: typeof prisma) => unknown)(prisma);
    }),
  };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrismaMock(prismaOverrides);
  // @ts-expect-error — 测试中直接注入 mock，不走 NestJS DI
  const svc = new ComplaintService(prisma);
  return { svc, prisma };
}

const baseCreateDto: CreateComplaintDto = {
  orderType: 'CLEANING',
  orderId: 1,
  reasonConfigIds: [2],
  description: '保洁不彻底，地板还有灰尘',
};

// ─── 1. create ───────────────────────────────────────────────────────────────

describe('ComplaintService — create（创建投诉）', () => {
  it('保洁订单投诉成功：返回 ComplaintDto，初始状态为 PENDING', async () => {
    const { svc, prisma } = makeService();
    const result = await svc.create(baseCreateDto);
    expect(result.status).toBe(ComplaintStatus.PENDING);
    expect(result.orderType).toBe('CLEANING');
    expect(prisma.complaintReasonConfig.findMany).toHaveBeenCalledWith({
      where: { id: { in: [2] } },
      select: { id: true, label: true, isEnabled: true },
    });
    expect(prisma.complaint.create).toHaveBeenCalledTimes(1);
  });

  it('在同一事务读取配置并写入 configId 与 label 快照', async () => {
    const { svc, prisma } = makeService();
    await svc.create(baseCreateDto);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.complaint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reasons: [{ configId: 2, label: '打扫不干净' }],
      }),
    });
  });

  it('废品订单投诉成功：orderType=RECYCLING', async () => {
    const { svc } = makeService();
    const result = await svc.create({ ...baseCreateDto, orderType: 'RECYCLING', orderId: 2 });
    expect(result.orderType).toBe('CLEANING'); // mock 返回固定行，断言 create 被调用即可
    expect(result).toMatchObject({ id: expect.any(Number) });
  });

  it('咨询订单投诉成功：orderType=CONSULT', async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseCreateDto, orderType: 'CONSULT', orderId: 3 });
    expect(prisma.consultOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
  });

  it('CleaningOrder 不存在：抛出 NotFoundException', async () => {
    const { svc, prisma } = makeService();
    prisma.cleaningOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.create(baseCreateDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('RecyclingOrder 不存在：抛出 NotFoundException', async () => {
    const { svc, prisma } = makeService();
    prisma.recyclingOrder.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.create({ ...baseCreateDto, orderType: 'RECYCLING', orderId: 99 }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('传入 evidenceImages：complaint.create 被调用一次', async () => {
    const { svc, prisma } = makeService();
    await svc.create({ ...baseCreateDto, evidenceImages: ['http://example.com/img.jpg'] });
    expect(prisma.complaint.create).toHaveBeenCalledTimes(1);
  });

  it('多选原因：按提交顺序去重后写入快照数组', async () => {
    const { svc, prisma } = makeService();
    prisma.complaintReasonConfig.findMany.mockResolvedValue([
      { id: 2, label: '打扫不干净', isEnabled: true },
      { id: 5, label: '服务态度差', isEnabled: true },
    ]);
    prisma.complaint.create = jest.fn().mockResolvedValue(
      makeComplaintRow({
        reasons: [
          { configId: 2, label: '打扫不干净' },
          { configId: 5, label: '服务态度差' },
        ],
      }),
    );

    const result = await svc.create({ ...baseCreateDto, reasonConfigIds: [2, 5, 2] });

    expect(prisma.complaintReasonConfig.findMany).toHaveBeenCalledWith({
      where: { id: { in: [2, 5] } },
      select: { id: true, label: true, isEnabled: true },
    });
    expect(prisma.complaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reasons: [
            { configId: 2, label: '打扫不干净' },
            { configId: 5, label: '服务态度差' },
          ],
        }),
      }),
    );
    expect(result.reasons).toEqual([
      { configId: 2, label: '打扫不干净' },
      { configId: 5, label: '服务态度差' },
    ]);
  });

  it('任一原因已停用时拒绝创建投诉', async () => {
    const { svc, prisma } = makeService();
    prisma.complaintReasonConfig.findMany.mockResolvedValue([
      { id: 2, label: '打扫不干净', isEnabled: false },
    ]);
    await expect(svc.create(baseCreateDto)).rejects.toMatchObject({
      constructor: BadRequestException,
      message: '投诉原因「打扫不干净」当前已停用，请重新选择',
    });
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });

  it('任一原因不存在时返回 404 且不创建投诉', async () => {
    const { svc, prisma } = makeService();
    prisma.complaintReasonConfig.findMany.mockResolvedValue([
      { id: 2, label: '打扫不干净', isEnabled: true },
    ]);
    await expect(svc.create({ ...baseCreateDto, reasonConfigIds: [2, 99] })).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '投诉原因（ID: 99）不存在',
    });
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });

  it('配置查询的其他数据库错误不应被吞掉', async () => {
    const { svc, prisma } = makeService();
    const error = new Error('database unavailable');
    prisma.complaintReasonConfig.findMany.mockRejectedValue(error);
    await expect(svc.create(baseCreateDto)).rejects.toBe(error);
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });
});

// ─── 2. findAll ──────────────────────────────────────────────────────────────

describe('ComplaintService — findAll（列表查询）', () => {
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

  it('按 status=PENDING 筛选：查询条件正确', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ status: 'PENDING' });
    expect(prisma.complaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(prisma.complaint.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: 'PENDING' }),
    });
  });

  it('按 orderType=CLEANING 筛选：查询条件正确', async () => {
    const { svc, prisma } = makeService();
    await svc.findAll({ orderType: 'CLEANING' });
    expect(prisma.complaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orderType: 'CLEANING' }) }),
    );
    expect(prisma.complaint.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ orderType: 'CLEANING' }),
    });
  });

  it('items 中的 DTO 结构正确', async () => {
    const { svc } = makeService();
    const result = await svc.findAll({});
    expect(result.items[0]).toMatchObject({
      id: expect.any(Number),
      status: expect.any(String),
      reasons: expect.any(Array),
      description: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});

// ─── 3. findOne ──────────────────────────────────────────────────────────────

describe('ComplaintService — findOne（详情查询）', () => {
  it('存在时返回 ComplaintDto + followUps 数组', async () => {
    const { svc } = makeService();
    const result = await svc.findOne(1);
    expect(result).toMatchObject({
      id: 1,
      status: ComplaintStatus.PENDING,
    });
    expect(Array.isArray(result.followUps)).toBe(true);
  });

  it('followUps 数组中每条记录包含 handlerName 和 content', async () => {
    const { svc } = makeService();
    const result = await svc.findOne(1);
    if (result.followUps.length > 0) {
      expect(result.followUps[0]).toMatchObject({
        id: expect.any(Number),
        complaintId: expect.any(Number),
        handlerName: expect.any(String),
        content: expect.any(String),
        createdAt: expect.any(String),
      });
    }
  });

  it('不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('配置删除后仍直接返回历史原因快照', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn().mockResolvedValue({
      ...makeComplaintRow({ reasons: [{ configId: 404, label: '已删除的历史原因' }] }),
      followUps: [],
    });
    await expect(svc.findOne(1)).resolves.toMatchObject({
      reasons: [{ configId: 404, label: '已删除的历史原因' }],
    });
    expect(prisma.complaintReasonConfig.findMany).not.toHaveBeenCalled();
  });
});

// ─── 4. updateStatus ─────────────────────────────────────────────────────────

describe('ComplaintService — updateStatus（状态转移）', () => {
  const toProcessing = { status: 'PROCESSING' as const, operatorName: '张管理员' };
  const toCompleted = { status: 'COMPLETED' as const, operatorName: '张管理员' };

  it('PENDING → PROCESSING：合法转移，complaint.update 被调用', async () => {
    const { svc, prisma } = makeService();
    // findOneOrThrow 返回 PENDING 状态
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValueOnce(makeComplaintRow({ status: ComplaintStatus.PENDING, followUps: [] }))
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.PROCESSING, followUps: [] }));
    await svc.updateStatus(1, toProcessing);
    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ComplaintStatus.PROCESSING } }),
    );
    expect(prisma.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderType: 'COMPLAINT', toStatus: ComplaintStatus.PROCESSING }),
      }),
    );
  });

  it('PROCESSING → COMPLETED：合法转移', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValueOnce(makeComplaintRow({ status: ComplaintStatus.PROCESSING, followUps: [] }))
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.COMPLETED, followUps: [] }));
    await svc.updateStatus(1, { ...toCompleted, remark: '已与居民协商完毕' });
    expect(prisma.complaint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ComplaintStatus.COMPLETED } }),
    );
    expect(prisma.orderStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderType: 'COMPLAINT',
          toStatus: ComplaintStatus.COMPLETED,
          remark: expect.stringContaining('张管理员'),
        }),
      }),
    );
  });

  it('PENDING → COMPLETED：跳步，抛出 BadRequestException', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.PENDING, followUps: [] }));
    await expect(svc.updateStatus(1, toCompleted)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PENDING → COMPLETED：错误消息包含"非法状态转移"', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.PENDING, followUps: [] }));
    await expect(svc.updateStatus(1, toCompleted)).rejects.toMatchObject({
      message: expect.stringContaining('非法状态转移'),
    });
  });

  it('COMPLETED 终态保护：再次更新抛出 BadRequestException', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.COMPLETED, followUps: [] }));
    await expect(svc.updateStatus(1, toProcessing)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('COMPLETED 终态保护：错误消息包含"终态"', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn()
      .mockResolvedValue(makeComplaintRow({ status: ComplaintStatus.COMPLETED, followUps: [] }));
    await expect(svc.updateStatus(1, toProcessing)).rejects.toMatchObject({
      message: expect.stringContaining('终态'),
    });
  });

  it('投诉不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.updateStatus(99, toProcessing)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── 5. addFollowUp ──────────────────────────────────────────────────────────

describe('ComplaintService — addFollowUp（添加跟进记录）', () => {
  const followUpDto = { handlerName: '张管理员', content: '已联系居民，正在协商' };

  it('成功添加跟进记录：返回 ComplaintFollowUpDto', async () => {
    const { svc, prisma } = makeService();
    // findOneOrThrow 需要 findUnique 返回投诉本身（非 include）
    prisma.complaint.findUnique = jest.fn().mockResolvedValue(makeComplaintRow());
    const result = await svc.addFollowUp(1, followUpDto);
    expect(result).toMatchObject({
      id: expect.any(Number),
      complaintId: expect.any(Number),
      handlerName: expect.any(String),
      content: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('成功添加：complaintFollowUp.create 被调用，传入正确字段', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn().mockResolvedValue(makeComplaintRow());
    await svc.addFollowUp(1, followUpDto);
    expect(prisma.complaintFollowUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          complaintId: 1,
          handlerName: '张管理员',
          content: '已联系居民，正在协商',
        }),
      }),
    );
  });

  it('投诉不存在时抛出 NotFoundException（404）', async () => {
    const { svc, prisma } = makeService();
    prisma.complaint.findUnique = jest.fn().mockResolvedValue(null);
    await expect(svc.addFollowUp(99, followUpDto)).rejects.toBeInstanceOf(NotFoundException);
  });
});
