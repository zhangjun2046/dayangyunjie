/**
 * P2.11 DashboardService 单元测试
 *
 * 测试矩阵：
 *  1. getSummary        — 统计卡（今日订单、本周订单、员工数、平均评分）
 *  2. getOrderTrend     — 订单趋势（日期序列正确、各类计数、默认近7天、自定义范围）
 *  3. getServiceTypeDistribution — 服务类型分布（三类正确、空数据）
 *  4. getRatingDistribution      — 满意度分布（5→1星倒序、空数据）
 *  5. getHourlyDistribution      — 时段分布（24小时桶正确、中文时段映射）
 *  6. getWorkerPerformance       — 员工绩效排名（按 completedInRange 倒序、Decimal rating 转换）
 */

import { DashboardService } from './dashboard.service';

// ─── Mock 工厂 ──────────────────────────────────────────────────────────────

function makeWorker(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: '张三',
    employeeNo: 'EMP001',
    totalOrders: 10,
    rating: 4.8,
    status: 'IDLE',
    ...overrides,
  };
}

/** 构造 Prisma mock（所有方法返回空结果，可在测试中按需覆盖） */
function makePrisma(overrides: Record<string, unknown> = {}) {
  const base = {
    cleaningOrder: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    recyclingOrder: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    consultOrder: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    worker: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    review: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null } }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  };
  return { ...base, ...overrides };
}

// ─── 测试套件 ────────────────────────────────────────────────────────────────

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DashboardService(prisma as never);
  });

  // ── 1. getSummary ──────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('应返回全部字段为 0 当数据库为空', async () => {
      const result = await service.getSummary({});
      expect(result).toEqual({
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
      });
    });

    it('应正确聚合时间范围内保洁+废品订单合计', async () => {
      // count 调用顺序：cleaningTotal, recyclingTotal, cleaningCompleted, recyclingCompleted,
      //                 cleaningInProgress, recyclingInProgress, cleaningPending, recyclingPending
      prisma.cleaningOrder.count
        .mockResolvedValueOnce(5)   // total cleaning
        .mockResolvedValueOnce(3)   // completed cleaning
        .mockResolvedValueOnce(1)   // inProgress cleaning
        .mockResolvedValueOnce(1);  // pending cleaning
      prisma.recyclingOrder.count
        .mockResolvedValueOnce(4)   // total recycling
        .mockResolvedValueOnce(2)   // completed recycling
        .mockResolvedValueOnce(1)   // inProgress recycling
        .mockResolvedValueOnce(1);  // pending recycling

      const result = await service.getSummary({ startDate: '2026-06-22', endDate: '2026-06-22' });
      expect(result.total).toBe(9);       // 5+4
      expect(result.completed).toBe(5);   // 3+2
      expect(result.inProgress).toBe(2);  // 1+1
      expect(result.pending).toBe(2);     // 1+1
    });

    it('缺省参数时应正常返回（默认本日）', async () => {
      const result = await service.getSummary({});
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('inProgress');
      expect(result).toHaveProperty('pending');
    });
  });

  // ── 2. getOrderTrend ──────────────────────────────────────────────────────

  describe('getOrderTrend', () => {
    it('缺省参数时返回 7 个日期', async () => {
      const result = await service.getOrderTrend({});
      expect(result.dates).toHaveLength(7);
      expect(result.cleaning).toHaveLength(7);
      expect(result.recycling).toHaveLength(7);
      expect(result.consult).toHaveLength(7);
    });

    it('自定义 startDate/endDate 时日期数量正确', async () => {
      const result = await service.getOrderTrend({
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      });
      expect(result.dates).toHaveLength(5);
      expect(result.dates[0]).toBe('2026-06-01');
      expect(result.dates[4]).toBe('2026-06-05');
    });

    it('应将数据库行按日期正确填入对应位置', async () => {
      prisma.cleaningOrder.findMany.mockResolvedValue([
        { createdAt: new Date('2026-06-01T10:00:00') },
        { createdAt: new Date('2026-06-01T14:00:00') },
        { createdAt: new Date('2026-06-03T09:00:00') },
      ]);
      prisma.recyclingOrder.findMany.mockResolvedValue([
        { createdAt: new Date('2026-06-02T08:00:00') },
      ]);

      const result = await service.getOrderTrend({
        startDate: '2026-06-01',
        endDate: '2026-06-03',
      });

      expect(result.cleaning).toEqual([2, 0, 1]);
      expect(result.recycling).toEqual([0, 1, 0]);
      expect(result.consult).toEqual([0, 0, 0]);
    });
  });

  // ── 3. getServiceTypeDistribution ────────────────────────────────────────

  describe('getServiceTypeDistribution', () => {
    it('空数据时三类 value 均为 0', async () => {
      const result = await service.getServiceTypeDistribution({});
      expect(result.data).toHaveLength(3);
      expect(result.data.every((d) => d.value === 0)).toBe(true);
    });

    it('应返回正确的 name/value 结构', async () => {
      prisma.cleaningOrder.count.mockResolvedValue(10);
      prisma.recyclingOrder.count.mockResolvedValue(5);
      prisma.consultOrder.count.mockResolvedValue(3);

      const result = await service.getServiceTypeDistribution({});
      expect(result.data).toEqual([
        { name: '保洁', value: 10 },
        { name: '废品回收', value: 5 },
        { name: '家政咨询', value: 3 },
      ]);
    });
  });

  // ── 4. getRatingDistribution ────────────────────────────────────────────

  describe('getRatingDistribution', () => {
    it('空数据时返回 5 个星级项且 value 均为 0', async () => {
      const result = await service.getRatingDistribution({});
      expect(result.data).toHaveLength(5);
      expect(result.data.map((d) => d.name)).toEqual(['5星', '4星', '3星', '2星', '1星']);
      expect(result.data.every((d) => d.value === 0)).toBe(true);
    });

    it('应正确映射 groupBy 结果到对应星级', async () => {
      prisma.review.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 8 } },
        { rating: 3, _count: { rating: 2 } },
      ]);

      const result = await service.getRatingDistribution({});
      expect(result.data).toEqual([
        { name: '5星', value: 8 },
        { name: '4星', value: 0 },
        { name: '3星', value: 2 },
        { name: '2星', value: 0 },
        { name: '1星', value: 0 },
      ]);
    });
  });

  // ── 5. getHourlyDistribution ────────────────────────────────────────────

  describe('getHourlyDistribution', () => {
    it('应返回 24 个小时桶', async () => {
      const result = await service.getHourlyDistribution({});
      expect(result.hours).toHaveLength(24);
      expect(result.counts).toHaveLength(24);
      expect(result.hours[0]).toBe('00:00');
      expect(result.hours[23]).toBe('23:00');
    });

    it('空数据时 counts 全为 0', async () => {
      const result = await service.getHourlyDistribution({});
      expect(result.counts.every((c) => c === 0)).toBe(true);
    });

    it('应正确解析数字时间段（如 "09:00-11:00"）', async () => {
      prisma.cleaningOrder.findMany.mockResolvedValue([
        { appointTimeSlot: '09:00-11:00' },
        { appointTimeSlot: '09:00-11:00' },
        { appointTimeSlot: '14:00-16:00' },
      ]);

      const result = await service.getHourlyDistribution({});
      expect(result.counts[9]).toBe(2);
      expect(result.counts[14]).toBe(1);
    });

    it('应正确映射中文时段（上午/下午/晚上）', async () => {
      prisma.recyclingOrder.findMany.mockResolvedValue([
        { appointTimeSlot: '上午' },
        { appointTimeSlot: '下午' },
        { appointTimeSlot: '晚上' },
      ]);

      const result = await service.getHourlyDistribution({});
      expect(result.counts[9]).toBe(1);   // 上午 → 9
      expect(result.counts[14]).toBe(1);  // 下午 → 14
      expect(result.counts[19]).toBe(1);  // 晚上 → 19
    });

    it('咨询单按 createdAt 小时统计', async () => {
      prisma.consultOrder.findMany.mockResolvedValue([
        { createdAt: new Date('2026-06-01T10:30:00') },
        { createdAt: new Date('2026-06-02T10:00:00') },
        { createdAt: new Date('2026-06-03T22:00:00') },
      ]);

      const result = await service.getHourlyDistribution({});
      expect(result.counts[10]).toBe(2);
      expect(result.counts[22]).toBe(1);
    });
  });

  // ── 6. getWorkerPerformance ────────────────────────────────────────────

  describe('getWorkerPerformance', () => {
    it('无员工时返回空数组', async () => {
      const result = await service.getWorkerPerformance({});
      expect(result.items).toEqual([]);
    });

    it('应正确组装员工绩效数据', async () => {
      prisma.worker.findMany.mockResolvedValue([makeWorker()]);
      prisma.cleaningOrder.groupBy.mockResolvedValue([
        { workerId: 1, _count: { id: 3 } },
      ]);
      prisma.recyclingOrder.groupBy.mockResolvedValue([
        { workerId: 1, _count: { id: 2 } },
      ]);

      const result = await service.getWorkerPerformance({});
      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.workerId).toBe(1);
      expect(item.name).toBe('张三');
      expect(item.employeeNo).toBe('EMP001');
      expect(item.totalOrders).toBe(10);
      expect(item.completedInRange).toBe(5); // 3+2
      expect(item.rating).toBe(4.8);
      expect(item.status).toBe('IDLE');
    });

    it('Decimal 类型 rating 应转换为数字并保留1位小数', async () => {
      // 模拟 Prisma Decimal 对象（有 toString/valueOf 但非原生 number）
      const decimalRating = { valueOf: () => 4.666, toString: () => '4.666' };
      prisma.worker.findMany.mockResolvedValue([
        makeWorker({ rating: decimalRating as never }),
      ]);

      const result = await service.getWorkerPerformance({});
      expect(result.items[0].rating).toBe(4.7);
    });

    it('无时间段内完成单的员工 completedInRange 应为 0', async () => {
      prisma.worker.findMany.mockResolvedValue([makeWorker({ id: 99 })]);
      // groupBy 无匹配行
      prisma.cleaningOrder.groupBy.mockResolvedValue([]);
      prisma.recyclingOrder.groupBy.mockResolvedValue([]);

      const result = await service.getWorkerPerformance({});
      expect(result.items[0].completedInRange).toBe(0);
    });

    it('应按 completedInRange 倒序排列', async () => {
      prisma.worker.findMany.mockResolvedValue([
        makeWorker({ id: 1, name: '甲', totalOrders: 5 }),
        makeWorker({ id: 2, name: '乙', totalOrders: 3 }),
      ]);
      prisma.cleaningOrder.groupBy.mockResolvedValue([
        { workerId: 1, _count: { id: 1 } },
        { workerId: 2, _count: { id: 4 } },
      ]);
      prisma.recyclingOrder.groupBy.mockResolvedValue([]);

      const result = await service.getWorkerPerformance({});
      expect(result.items[0].workerId).toBe(2); // completedInRange=4 排前
      expect(result.items[1].workerId).toBe(1);
    });
  });
});
