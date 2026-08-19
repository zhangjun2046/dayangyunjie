/**
 * P2.14 Operator 模块单元测试 — 全 CRUD + findContact 接单人查询
 *
 * 测试矩阵：
 *  1. findAll     — 分页返回列表；可按 purpose 过滤
 *  2. findContact — 返回 purpose='接单' 的全部记录；无记录时返回 []
 *  3. findOne     — 存在返回 DTO；不存在 → 404
 *  4. create      — 成功创建并返回 DTO
 *  5. remove      — 存在时删除；不存在 → 404
 */

import { NotFoundException } from '@nestjs/common';
import { OperatorService } from './operator.service';

// ─── 工厂函数 ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: '运营客服',
    phone: '13800138000',
    purpose: '接单',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makePrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    operator: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...((overrides as any).operator ?? {}),
    },
    $transaction: jest.fn(),
    ...overrides,
  };
}

// ─── 测试套件 ──────────────────────────────────────────────────────────────────

describe('OperatorService', () => {
  let service: OperatorService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new OperatorService(prisma as any);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('分页返回运营人员列表', async () => {
      const rows = [makeRow()];
      prisma.$transaction.mockResolvedValue([rows, 1]);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('运营客服');
    });

    it('按 purpose 模糊过滤', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, pageSize: 10, purpose: '咨询' });

      expect(result.total).toBe(0);
    });
  });

  // ── findContact ────────────────────────────────────────────────────────────

  describe('findContact', () => {
    it('返回用途为「接单」的全部运营人员', async () => {
      const rows = [
        makeRow({ id: 1, purpose: '接单', phone: '13800138001' }),
        makeRow({ id: 2, purpose: '接单', name: '运营二', phone: '13800138002' }),
      ];
      prisma.operator.findMany.mockResolvedValue(rows);

      const result = await service.findContact();

      expect(prisma.operator.findMany).toHaveBeenCalledWith({
        where: { purpose: '接单' },
        orderBy: { id: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].phone).toBe('13800138001');
      expect(result[1].name).toBe('运营二');
    });

    it('无接单运营人员时返回空数组', async () => {
      prisma.operator.findMany.mockResolvedValue([]);

      const result = await service.findContact();

      expect(result).toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('存在时返回 DTO', async () => {
      prisma.operator.findUnique.mockResolvedValue(makeRow());

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.phone).toBe('13800138000');
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.operator.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('成功创建并返回 DTO', async () => {
      const row = makeRow({ name: '新运营', phone: '13900139000', purpose: '接单' });
      prisma.operator.create.mockResolvedValue(row);

      const result = await service.create({ name: '新运营', phone: '13900139000', purpose: '接单' });

      expect(prisma.operator.create).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('新运营');
      expect(result.purpose).toBe('接单');
    });

    it('不传 purpose 时默认为「接单」', async () => {
      const row = makeRow({ purpose: '接单' });
      prisma.operator.create.mockResolvedValue(row);

      const result = await service.create({ name: '新运营', phone: '13900139000' });

      expect(result.purpose).toBe('接单');
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('存在时删除并返回 { id }', async () => {
      prisma.operator.count.mockResolvedValue(1);
      prisma.operator.delete.mockResolvedValue(undefined);

      const result = await service.remove(1);

      expect(result).toEqual({ id: 1 });
      expect(prisma.operator.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.operator.count.mockResolvedValue(0);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
