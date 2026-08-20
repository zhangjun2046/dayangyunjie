import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewKeywordService } from './review-keyword.service';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  bizType: 'CLEANING',
  keyword: '准时到达',
  sortOrder: 1,
  isEnabled: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const makePrisma = () => ({
  reviewKeyword: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('ReviewKeywordService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReviewKeywordService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReviewKeywordService(prisma as any);
  });

  describe('findAll', () => {
    it('按筛选条件、分页和稳定排序查询', async () => {
      prisma.$transaction.mockResolvedValue([[makeRow()], 1]);
      const result = await service.findAll({
        page: 2,
        pageSize: 5,
        bizType: 'CLEANING',
        keyword: ' 准时 ',
        isEnabled: true,
      });

      expect(prisma.reviewKeyword.findMany).toHaveBeenCalledWith({
        where: {
          bizType: 'CLEANING',
          keyword: { contains: '准时' },
          isEnabled: true,
        },
        skip: 5,
        take: 5,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      expect(result).toMatchObject({ total: 1, page: 2, pageSize: 5 });
      expect(result.items[0].keyword).toBe('准时到达');
    });

    it('未传筛选条件时使用空 where', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, pageSize: 10 });
      expect(prisma.reviewKeyword.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('返回详情并序列化时间', async () => {
      prisma.reviewKeyword.findUnique.mockResolvedValue(makeRow());
      const result = await service.findOne(1);
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('记录不存在时抛出 NotFoundException', async () => {
      prisma.reviewKeyword.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('去除关键词两侧空格', async () => {
      prisma.reviewKeyword.create.mockResolvedValue(makeRow());
      await service.create({ bizType: 'CLEANING', keyword: ' 准时到达 ', sortOrder: 1 });
      expect(prisma.reviewKeyword.create).toHaveBeenCalledWith({
        data: { bizType: 'CLEANING', keyword: '准时到达', sortOrder: 1 },
      });
    });

    it('未传排序时使用默认值 0', async () => {
      prisma.reviewKeyword.create.mockResolvedValue(makeRow({ sortOrder: 0 }));
      await service.create({ bizType: 'CLEANING', keyword: '态度好' });
      expect(prisma.reviewKeyword.create).toHaveBeenCalledWith({
        data: { bizType: 'CLEANING', keyword: '态度好', sortOrder: 0 },
      });
    });

    it('纯空格关键词抛出 BadRequestException', async () => {
      await expect(service.create({ bizType: 'CLEANING', keyword: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.reviewKeyword.create).not.toHaveBeenCalled();
    });

    it('重复关键词转换为 ConflictException', async () => {
      prisma.reviewKeyword.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.create({ bizType: 'CLEANING', keyword: '准时到达' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('非唯一约束错误保持原样抛出', async () => {
      const error = new Error('database unavailable');
      prisma.reviewKeyword.create.mockRejectedValue(error);
      await expect(service.create({ bizType: 'CLEANING', keyword: '准时到达' })).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('更新业务类型、关键词和排序', async () => {
      prisma.reviewKeyword.count.mockResolvedValue(1);
      prisma.reviewKeyword.update.mockResolvedValue(
        makeRow({ bizType: 'RECYCLING', keyword: '响应迅速', sortOrder: 2 }),
      );
      const result = await service.update(1, {
        bizType: 'RECYCLING',
        keyword: ' 响应迅速 ',
        sortOrder: 2,
      });
      expect(prisma.reviewKeyword.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { bizType: 'RECYCLING', keyword: '响应迅速', sortOrder: 2 },
      });
      expect(result.bizType).toBe('RECYCLING');
    });

    it('记录不存在时不执行更新', async () => {
      prisma.reviewKeyword.count.mockResolvedValue(0);
      await expect(service.update(999, { keyword: '响应迅速' })).rejects.toThrow(NotFoundException);
      expect(prisma.reviewKeyword.update).not.toHaveBeenCalled();
    });

    it('更新为重复关键词时转换为 ConflictException', async () => {
      prisma.reviewKeyword.count.mockResolvedValue(1);
      prisma.reviewKeyword.update.mockRejectedValue({ code: 'P2002' });
      await expect(service.update(1, { keyword: '态度好' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('删除存在的关键词', async () => {
      prisma.reviewKeyword.count.mockResolvedValue(1);
      prisma.reviewKeyword.delete.mockResolvedValue(makeRow());
      await expect(service.remove(1)).resolves.toEqual({ id: 1 });
      expect(prisma.reviewKeyword.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('记录不存在时不执行删除', async () => {
      prisma.reviewKeyword.count.mockResolvedValue(0);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(prisma.reviewKeyword.delete).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it.each([
      [true, false],
      [false, true],
    ])('将 isEnabled=%s 切换为 %s', async (current, expected) => {
      prisma.reviewKeyword.findUnique.mockResolvedValue(makeRow({ isEnabled: current }));
      prisma.reviewKeyword.update.mockResolvedValue(makeRow({ isEnabled: expected }));
      const result = await service.toggle(1);
      expect(prisma.reviewKeyword.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isEnabled: expected },
      });
      expect(result.isEnabled).toBe(expected);
    });

    it('记录不存在时不能切换状态', async () => {
      prisma.reviewKeyword.findUnique.mockResolvedValue(null);
      await expect(service.toggle(999)).rejects.toThrow(NotFoundException);
      expect(prisma.reviewKeyword.update).not.toHaveBeenCalled();
    });
  });
});
