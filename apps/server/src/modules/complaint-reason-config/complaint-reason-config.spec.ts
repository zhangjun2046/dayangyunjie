import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintReasonConfigService } from './complaint-reason-config.service';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  label: '打扫不干净',
  sortOrder: 2,
  isEnabled: true,
  createdAt: new Date('2026-08-20T00:00:00.000Z'),
  updatedAt: new Date('2026-08-20T00:00:00.000Z'),
  ...overrides,
});

const makePrisma = () => ({
  complaintReasonConfig: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('ComplaintReasonConfigService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ComplaintReasonConfigService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ComplaintReasonConfigService(prisma as any);
  });

  it('公开查询仅返回启用项并按 sortOrder/id 排序', async () => {
    prisma.complaintReasonConfig.findMany.mockResolvedValue([makeRow()]);
    await expect(service.findEnabled()).resolves.toEqual([
      expect.objectContaining({ id: 2, label: '打扫不干净' }),
    ]);
    expect(prisma.complaintReasonConfig.findMany).toHaveBeenCalledWith({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  });

  it('管理查询支持 id/label/isEnabled 筛选', async () => {
    prisma.$transaction.mockResolvedValue([[makeRow()], 1]);
    await service.findAll({
      page: 2,
      pageSize: 3,
      id: 2,
      label: ' 打扫 ',
      isEnabled: false,
    });
    expect(prisma.complaintReasonConfig.findMany).toHaveBeenCalledWith({
      where: { id: 2, label: { contains: '打扫' }, isEnabled: false },
      skip: 3,
      take: 3,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  });

  it('创建时 trim label 并写入默认值', async () => {
    prisma.complaintReasonConfig.create.mockResolvedValue(makeRow());
    await service.create({ label: ' 打扫不干净 ' });
    expect(prisma.complaintReasonConfig.create).toHaveBeenCalledWith({
      data: { label: '打扫不干净', sortOrder: 0, isEnabled: true },
    });
  });

  it.each(['', '   ', 'x'.repeat(33)])('拒绝非法 label=%p', async (label) => {
    await expect(service.create({ label })).rejects.toThrow(BadRequestException);
  });

  it('创建重复 label 将 P2002 转为 409', async () => {
    prisma.complaintReasonConfig.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ label: '重复原因' })).rejects.toThrow(ConflictException);
  });

  it('按 id 查询不存在配置返回 404', async () => {
    prisma.complaintReasonConfig.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('更新 trim label，并将重复冲突转为 409', async () => {
    prisma.complaintReasonConfig.update.mockRejectedValue({ code: 'P2002' });
    await expect(service.update(2, { label: ' 重复原因 ' })).rejects.toThrow(ConflictException);
    expect(prisma.complaintReasonConfig.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { label: '重复原因' },
    });
  });

  it('更新不存在配置返回 404', async () => {
    prisma.complaintReasonConfig.update.mockRejectedValue({ code: 'P2025' });
    await expect(service.update(99, { sortOrder: 1 })).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '投诉原因配置（ID: 99）不存在',
    });
  });

  it('按 id 使用 CAS 切换启用状态', async () => {
    prisma.complaintReasonConfig.findUnique
      .mockResolvedValueOnce(makeRow({ isEnabled: true }))
      .mockResolvedValueOnce(makeRow({ isEnabled: false }));
    prisma.complaintReasonConfig.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.toggle(2)).resolves.toMatchObject({ id: 2, isEnabled: false });
    expect(prisma.complaintReasonConfig.updateMany).toHaveBeenCalledWith({
      where: { id: 2, isEnabled: true },
      data: { isEnabled: false },
    });
  });

  it('CAS 竞争失败后读取最新状态并重试，保留每次切换', async () => {
    prisma.complaintReasonConfig.findUnique
      .mockResolvedValueOnce(makeRow({ isEnabled: true }))
      .mockResolvedValueOnce(makeRow({ isEnabled: false }))
      .mockResolvedValueOnce(makeRow({ isEnabled: true }));
    prisma.complaintReasonConfig.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.toggle(2)).resolves.toMatchObject({ isEnabled: true });
    expect(prisma.complaintReasonConfig.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 2, isEnabled: true },
      data: { isEnabled: false },
    });
    expect(prisma.complaintReasonConfig.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 2, isEnabled: false },
      data: { isEnabled: true },
    });
  });

  it('toggle CAS 期间配置被删除返回中文 404', async () => {
    prisma.complaintReasonConfig.findUnique
      .mockResolvedValueOnce(makeRow())
      .mockResolvedValueOnce(null);
    prisma.complaintReasonConfig.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.toggle(2)).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '投诉原因配置（ID: 2）不存在',
    });
  });

  it('硬删除配置并返回 id', async () => {
    prisma.complaintReasonConfig.delete.mockResolvedValue(makeRow());
    await expect(service.remove(2)).resolves.toEqual({ id: 2 });
    expect(prisma.complaintReasonConfig.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('删除竞态的 P2025 转为中文 404', async () => {
    prisma.complaintReasonConfig.delete.mockRejectedValue({ code: 'P2025' });
    await expect(service.remove(2)).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '投诉原因配置（ID: 2）不存在',
    });
  });
});
