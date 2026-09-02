/**
 * P2.14 ServiceCatalog 模块单元测试 — 全 CRUD + toggle
 *
 * 测试矩阵：
 *  1. findAll   — 默认仅返回启用项；可按 bizType 过滤
 *  2. findOne   — 存在返回 DTO；不存在 → 404
 *  3. create    — 成功创建并返回 DTO
 *  4. update    — 存在时更新；不存在 → 404
 *  5. remove    — 存在时删除；不存在 → 404
 *  6. toggle    — 反转 isEnabled；不存在 → 404
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceCatalogService } from './service-catalog.service';

// ─── 工厂函数 ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    bizType: 'CLEANING',
    name: '普通保洁',
    subtitle: null,
    icon: null,
    priceImageUrl: null,
    sortOrder: 0,
    isEnabled: true,
    specialTips: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makePrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    serviceCatalog: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...((overrides as any).serviceCatalog ?? {}),
    },
    recyclingItem: {
      count: jest.fn().mockResolvedValue(0),
      ...((overrides as any).recyclingItem ?? {}),
    },
    $transaction: jest.fn(),
    ...overrides,
  };
}

// ─── 测试套件 ──────────────────────────────────────────────────────────────────

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ServiceCatalogService(prisma as any);
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('默认返回启用的服务目录列表', async () => {
      const rows = [makeRow()];
      prisma.$transaction.mockResolvedValue([rows, 1]);

      const result = await service.findAll({ page: 1, pageSize: 10, isEnabled: true });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('普通保洁');
      expect(result.items[0].isEnabled).toBe(true);
    });

    it('按 bizType 过滤', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, pageSize: 10, bizType: 'RECYCLING', isEnabled: true });

      expect(result.total).toBe(0);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('存在时返回 DTO', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeRow());

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.bizType).toBe('CLEANING');
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('成功创建并返回 DTO', async () => {
      const row = makeRow({ name: '深度保洁', sortOrder: 1 });
      prisma.serviceCatalog.create.mockResolvedValue(row);

      const result = await service.create({ bizType: 'CLEANING', name: '深度保洁', sortOrder: 1 });

      expect(prisma.serviceCatalog.create).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('深度保洁');
      expect(result.sortOrder).toBe(1);
    });

    it('创建时可写入 icon URL', async () => {
      const icon = 'https://cdn.example.com/uploads/ICON_1.webp';
      prisma.serviceCatalog.create.mockResolvedValue(makeRow({ icon }));

      const result = await service.create({
        bizType: 'CLEANING',
        name: '日常清扫',
        icon,
      });

      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: {
          bizType: 'CLEANING',
          name: '日常清扫',
          subtitle: undefined,
          icon,
          priceImageUrl: null,
          sortOrder: 0,
        },
      });
      expect(result.icon).toBe(icon);
    });

    it('大件分类创建时可写入价格海报', async () => {
      const poster = 'https://cdn.example.com/uploads/POSTER_1.webp';
      prisma.serviceCatalog.create.mockResolvedValue(
        makeRow({ bizType: 'RECYCLING', name: '大件类', priceImageUrl: poster }),
      );

      const result = await service.create({
        bizType: 'RECYCLING',
        name: '大件类',
        priceImageUrl: poster,
      });

      expect(prisma.serviceCatalog.create).toHaveBeenCalledWith({
        data: {
          bizType: 'RECYCLING',
          name: '大件类',
          subtitle: undefined,
          icon: undefined,
          priceImageUrl: poster,
          sortOrder: 0,
        },
      });
      expect(result.priceImageUrl).toBe(poster);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('存在时更新并返回新 DTO', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeRow());
      const updated = makeRow({ name: '精品保洁' });
      prisma.serviceCatalog.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: '精品保洁' });

      expect(result.name).toBe('精品保洁');
    });

    it('传入 null 时清除已配置的图标', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeRow({ icon: 'https://cdn.example.com/a.webp' }));
      prisma.serviceCatalog.update.mockResolvedValue(makeRow({ icon: null }));

      await service.update(1, { icon: null });

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { icon: null, priceImageUrl: null },
      });
    });

    it('大件分类可写入价格海报', async () => {
      const poster = 'https://cdn.example.com/uploads/POSTER_1.webp';
      prisma.serviceCatalog.findUnique.mockResolvedValue(
        makeRow({ bizType: 'RECYCLING', name: '大件类' }),
      );
      prisma.serviceCatalog.update.mockResolvedValue(
        makeRow({ bizType: 'RECYCLING', name: '大件类', priceImageUrl: poster }),
      );

      const result = await service.update(1, { priceImageUrl: poster });

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { priceImageUrl: poster },
      });
      expect(result.priceImageUrl).toBe(poster);
    });

    it('非大件分类即使传入海报也不保存', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeRow({ bizType: 'RECYCLING', name: '小件类' }));
      prisma.serviceCatalog.update.mockResolvedValue(
        makeRow({ bizType: 'RECYCLING', name: '小件类', priceImageUrl: null }),
      );

      await service.update(1, { priceImageUrl: 'https://cdn.example.com/poster.webp' });

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { priceImageUrl: null },
      });
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: '精品保洁' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('存在时删除并返回 { id }', async () => {
      prisma.serviceCatalog.count.mockResolvedValue(1);
      prisma.recyclingItem.count.mockResolvedValue(0);
      prisma.serviceCatalog.delete.mockResolvedValue(undefined);

      const result = await service.remove(1);

      expect(result).toEqual({ id: 1 });
      expect(prisma.serviceCatalog.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('仍有回收品项时返回 400', async () => {
      prisma.serviceCatalog.count.mockResolvedValue(1);
      prisma.recyclingItem.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(
        new BadRequestException('请先删除该分类下的回收品项'),
      );
      expect(prisma.serviceCatalog.delete).not.toHaveBeenCalled();
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.serviceCatalog.count.mockResolvedValue(0);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── toggle ─────────────────────────────────────────────────────────────────

  describe('toggle', () => {
    it('isEnabled=true 时切换为 false', async () => {
      const row = makeRow({ isEnabled: true });
      prisma.serviceCatalog.findUnique.mockResolvedValue(row);
      const toggled = makeRow({ isEnabled: false });
      prisma.serviceCatalog.update.mockResolvedValue(toggled);

      const result = await service.toggle(1);

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isEnabled: false },
      });
      expect(result.isEnabled).toBe(false);
    });

    it('isEnabled=false 时切换为 true', async () => {
      const row = makeRow({ isEnabled: false });
      prisma.serviceCatalog.findUnique.mockResolvedValue(row);
      const toggled = makeRow({ isEnabled: true });
      prisma.serviceCatalog.update.mockResolvedValue(toggled);

      const result = await service.toggle(1);

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isEnabled: true },
      });
      expect(result.isEnabled).toBe(true);
    });

    it('不存在时抛出 NotFoundException', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(service.toggle(999)).rejects.toThrow(NotFoundException);
    });
  });
});
