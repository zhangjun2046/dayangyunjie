import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecyclingItemService } from './recycling-item.service';

function makeCatalog(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    bizType: 'RECYCLING',
    name: '小件类废品',
    subtitle: null,
    icon: null,
    sortOrder: 2,
    isEnabled: true,
    specialTips: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  const catalog = (overrides.catalog as ReturnType<typeof makeCatalog> | undefined) ?? makeCatalog();
  return {
    id: 1,
    catalogId: catalog.id,
    name: '纸张',
    priceText: '0.6元/kg',
    icon: null,
    sortOrder: 1,
    isEnabled: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    catalog,
    ...overrides,
  };
}

function makePrismaMock() {
  return {
    recyclingItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    serviceCatalog: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('RecyclingItemService', () => {
  let service: RecyclingItemService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new RecyclingItemService(prisma as any);
  });

  describe('create', () => {
    it('父分类是保洁时返回 400', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeCatalog({ bizType: 'CLEANING', name: '日常清扫' }));

      await expect(
        service.create({ catalogId: 1, name: '纸张', priceText: '0.6元/kg' }),
      ).rejects.toThrow(new BadRequestException('请选择废品回收下的服务分类'));
      expect(prisma.recyclingItem.create).not.toHaveBeenCalled();
    });

    it('父分类不存在时返回 400', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ catalogId: 999, name: '纸张', priceText: '0.6元/kg' }),
      ).rejects.toThrow(new BadRequestException('请选择废品回收下的服务分类'));
    });

    it('同一分类下重名返回 400', async () => {
      prisma.serviceCatalog.findUnique.mockResolvedValue(makeCatalog());
      prisma.recyclingItem.findFirst.mockResolvedValue(makeRow());

      await expect(
        service.create({ catalogId: 4, name: '纸张', priceText: '0.6元/kg' }),
      ).rejects.toThrow(new BadRequestException('该分类下已存在同名回收品项'));
    });

    it('不同分类可以同名', async () => {
      const largeCatalog = makeCatalog({ id: 3, name: '大件类废品' });
      prisma.serviceCatalog.findUnique.mockResolvedValue(largeCatalog);
      prisma.recyclingItem.findFirst.mockResolvedValue(null);
      prisma.recyclingItem.create.mockResolvedValue(
        makeRow({ catalogId: 3, name: '纸张', catalog: largeCatalog }),
      );

      const result = await service.create({ catalogId: 3, name: '纸张', priceText: '面议' });

      expect(result.name).toBe('纸张');
      expect(result.catalogId).toBe(3);
      expect(prisma.recyclingItem.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findEnabled', () => {
    it('不含停用品项、不含停用分类下的品项', async () => {
      prisma.recyclingItem.findMany.mockResolvedValue([makeRow()]);

      const result = await service.findEnabled({ catalogId: 4 });

      expect(prisma.recyclingItem.findMany).toHaveBeenCalledWith({
        where: {
          isEnabled: true,
          catalog: {
            isEnabled: true,
            bizType: 'RECYCLING',
            id: 4,
          },
        },
        include: { catalog: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].catalogName).toBe('小件类废品');
    });
  });

  describe('findOne', () => {
    it('不存在时 404', async () => {
      prisma.recyclingItem.findUnique.mockResolvedValue(null);
      await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    });
  });
});
