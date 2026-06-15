/**
 * P2.14 Banner 模块单元测试 — 全 CRUD + findActive 有效轮播查询
 *
 * 测试矩阵：
 *  1. findAll    — 分页返回列表；可按 displayTarget/isEnabled 过滤
 *  2. findActive — 仅返回 isEnabled=true 且当前时间在 startTime~endTime 内的记录
 *  3. findOne    — 存在返回 DTO；不存在 → 404
 *  4. create     — 成功创建并返回 DTO
 *  5. remove     — 存在时删除；不存在 → 404
 */

import { NotFoundException } from '@nestjs/common';
import { BannerService } from './banner.service';

// ─── 工厂函数 ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-15T10:00:00Z');

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    imageUrl: 'https://cdn.example.com/banner.jpg',
    title: '夏季特惠',
    displayTarget: 'RESIDENT',
    linkType: 'NONE',
    linkTarget: null,
    startTime: new Date('2026-01-01T00:00:00Z'),
    endTime: new Date('2026-12-31T23:59:59Z'),
    sortOrder: 0,
    isEnabled: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makePrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    banner: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...((overrides as any).banner ?? {}),
    },
    $transaction: jest.fn(),
    ...overrides,
  };
}

// ─── 测试套件 ──────────────────────────────────────────────────────────────────

describe('BannerService', () => {
  let service: BannerService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new BannerService(prisma as any);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('分页返回轮播图列表', async () => {
      const rows = [makeRow()];
      prisma.$transaction.mockResolvedValue([rows, 1]);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.total).toBe(1);
      expect(result.items[0].imageUrl).toBe('https://cdn.example.com/banner.jpg');
    });

    it('按 displayTarget 过滤', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, pageSize: 10, displayTarget: 'WORKER' });

      expect(result.total).toBe(0);
    });
  });

  // ── findActive ─────────────────────────────────────────────────────────────

  describe('findActive', () => {
    it('返回 isEnabled=true 且在生效时间范围内的轮播图', async () => {
      const activeRow = makeRow({ isEnabled: true });
      prisma.banner.findMany.mockResolvedValue([activeRow]);

      const result = await service.findActive({});

      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isEnabled: true,
            startTime: expect.objectContaining({ lte: expect.any(Date) }),
            endTime: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].isEnabled).toBe(true);
    });

    it('按 displayTarget 过滤有效轮播图', async () => {
      prisma.banner.findMany.mockResolvedValue([]);

      const result = await service.findActive({ displayTarget: 'WORKER' });

      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isEnabled: true,
            displayTarget: 'WORKER',
          }),
        }),
      );
      expect(result).toHaveLength(0);
    });

    it('已禁用的轮播图不出现在结果中', async () => {
      prisma.banner.findMany.mockResolvedValue([]);

      const result = await service.findActive({});

      expect(result).toHaveLength(0);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('存在时返回 DTO', async () => {
      prisma.banner.findUnique.mockResolvedValue(makeRow());

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.displayTarget).toBe('RESIDENT');
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('成功创建并返回 DTO', async () => {
      const row = makeRow({ title: '新年活动' });
      prisma.banner.create.mockResolvedValue(row);

      const result = await service.create({
        imageUrl: 'https://cdn.example.com/banner.jpg',
        startTime: '2026-01-01T00:00:00Z',
        endTime: '2026-12-31T23:59:59Z',
        title: '新年活动',
      });

      expect(prisma.banner.create).toHaveBeenCalledTimes(1);
      expect(result.title).toBe('新年活动');
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('存在时删除并返回 { id }', async () => {
      prisma.banner.count.mockResolvedValue(1);
      prisma.banner.delete.mockResolvedValue(undefined);

      const result = await service.remove(1);

      expect(result).toEqual({ id: 1 });
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.banner.count.mockResolvedValue(0);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
