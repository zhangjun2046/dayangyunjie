import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { APPOINT_TIME_SLOT_FORMAT_MESSAGE } from '@dayangyunjie/shared';
import { AppointTimeSlotService } from './appoint-time-slot.service';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  bizType: 'CLEANING',
  label: '08:00',
  sortOrder: 1,
  isEnabled: true,
  createdAt: new Date('2026-09-17T00:00:00Z'),
  updatedAt: new Date('2026-09-17T00:00:00Z'),
  ...overrides,
});

const makePrisma = () => ({
  appointTimeSlotConfig: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  appointTimeLeadConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('AppointTimeSlotService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AppointTimeSlotService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AppointTimeSlotService(prisma as any);
  });

  it('公开查询按业务过滤启用项并按时段文案排序', async () => {
    prisma.appointTimeSlotConfig.findMany.mockResolvedValue([makeRow()]);
    await expect(service.findEnabled('CLEANING')).resolves.toEqual([
      expect.objectContaining({ id: 1, label: '08:00', bizType: 'CLEANING' }),
    ]);
    expect(prisma.appointTimeSlotConfig.findMany).toHaveBeenCalledWith({
      where: { bizType: 'CLEANING', isEnabled: true },
      orderBy: [{ label: 'asc' }, { id: 'asc' }],
    });
  });

  it('管理查询支持 bizType/label/isEnabled 筛选', async () => {
    prisma.$transaction.mockResolvedValue([[makeRow()], 1]);
    await service.findAll({
      page: 2,
      pageSize: 5,
      bizType: 'RECYCLING',
      label: ' 08 ',
      isEnabled: true,
    });
    expect(prisma.appointTimeSlotConfig.findMany).toHaveBeenCalledWith({
      where: { bizType: 'RECYCLING', label: { contains: '08' }, isEnabled: true },
      skip: 5,
      take: 5,
      orderBy: [{ label: 'asc' }, { id: 'asc' }],
    });
  });

  it('创建时 trim 并写入默认值', async () => {
    prisma.appointTimeSlotConfig.create.mockResolvedValue(makeRow());
    await service.create({ bizType: 'CLEANING', label: ' 08:00 ' });
    expect(prisma.appointTimeSlotConfig.create).toHaveBeenCalledWith({
      data: { bizType: 'CLEANING', label: '08:00', sortOrder: 0, isEnabled: true },
    });
  });

  it.each(['', '8:00', '08:0', '14:00-16:00', '下午两点'])(
    '拒绝非法 label=%p',
    async (label) => {
      await expect(service.create({ bizType: 'CLEANING', label })).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APPOINT_TIME_SLOT_FORMAT_MESSAGE,
      });
    },
  );

  it('创建重复格子将 P2002 转为 409', async () => {
    prisma.appointTimeSlotConfig.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ bizType: 'CLEANING', label: '08:00' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('更新 trim label，并将重复冲突转为 409', async () => {
    prisma.appointTimeSlotConfig.update.mockRejectedValue({ code: 'P2002' });
    await expect(service.update(1, { label: ' 09:00 ' })).rejects.toThrow(ConflictException);
    expect(prisma.appointTimeSlotConfig.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { label: '09:00' },
    });
  });

  it('更新不存在配置返回 404', async () => {
    prisma.appointTimeSlotConfig.update.mockRejectedValue({ code: 'P2025' });
    await expect(service.update(99, { sortOrder: 1 })).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '预约时段配置（ID: 99）不存在',
    });
  });

  it('切换启用状态', async () => {
    prisma.appointTimeSlotConfig.findUnique.mockResolvedValue(makeRow({ isEnabled: true }));
    prisma.appointTimeSlotConfig.update.mockResolvedValue(makeRow({ isEnabled: false }));
    await expect(service.toggle(1)).resolves.toMatchObject({ isEnabled: false });
    expect(prisma.appointTimeSlotConfig.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isEnabled: false },
    });
  });

  it('toggle 找不到记录返回 404', async () => {
    prisma.appointTimeSlotConfig.findUnique.mockResolvedValue(null);
    await expect(service.toggle(9)).rejects.toThrow(NotFoundException);
  });

  it('硬删除并返回 id', async () => {
    prisma.appointTimeSlotConfig.delete.mockResolvedValue(makeRow());
    await expect(service.remove(1)).resolves.toEqual({ id: 1 });
  });

  it('删除不存在转为 404', async () => {
    prisma.appointTimeSlotConfig.delete.mockRejectedValue({ code: 'P2025' });
    await expect(service.remove(9)).rejects.toMatchObject({
      constructor: NotFoundException,
      message: '预约时段配置（ID: 9）不存在',
    });
  });

  it('缺缓冲配置时兜底 60 分钟', async () => {
    prisma.appointTimeLeadConfig.findUnique.mockResolvedValue(null);
    await expect(service.getLeadMinutes('CLEANING')).resolves.toBe(60);
  });

  it('过近预约抛出动态文案', async () => {
    prisma.appointTimeLeadConfig.findUnique.mockResolvedValue({
      bizType: 'CLEANING',
      leadMinutes: 60,
    });
    await expect(
      service.assertAppointNotTooSoon('CLEANING', '2000-01-01', '08:00'),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      message: '请至少提前 60 分钟预约',
    });
  });

  it('缓冲为 0 时使用已过文案', async () => {
    prisma.appointTimeLeadConfig.findUnique.mockResolvedValue({
      bizType: 'RECYCLING',
      leadMinutes: 0,
    });
    await expect(
      service.assertAppointNotTooSoon('RECYCLING', '2000-01-01', '08:00'),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      message: '预约时间已过，请选择更晚的时段',
    });
  });
});
