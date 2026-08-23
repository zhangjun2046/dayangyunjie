import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkerStatus } from '@prisma/client';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { WorkerService } from './worker.service';

const CERT_URLS = Array.from(
  { length: 9 },
  (_, index) => `http://localhost:3000/uploads/skill-${index + 1}.jpg`,
);

function makeWorkerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    employeeNo: 'WK0001',
    passwordHash: 'hashed-password',
    name: '测试员工',
    phone: '13900000000',
    nickname: null,
    gender: 'MALE',
    idCard: null,
    position: 'CLEANER',
    skillType: 'CLEANING',
    emergencyContact: null,
    emergencyPhone: null,
    avatar: null,
    status: WorkerStatus.IDLE,
    rating: 5,
    totalOrders: 0,
    healthCertUrl: null,
    healthCertExpiry: null,
    skillCertUrl: null,
    skillCertUrls: null,
    skillCertExpiry: null,
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
    updatedAt: new Date('2026-08-20T00:00:00.000Z'),
    ...overrides,
  };
}

function makePrismaMock(row = makeWorkerRow()) {
  return {
    worker: {
      create: jest.fn().mockResolvedValue(row),
      findUnique: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      delete: jest.fn().mockResolvedValue(row),
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(1),
    },
    // findOne/update 会走 getStatsForWorkers 的今日完成量统计
    orderStatusLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    cleaningOrder: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    recyclingOrder: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations)),
  };
}

function makeService(row = makeWorkerRow()) {
  const prisma = makePrismaMock(row);
  // @ts-expect-error 测试中直接注入最小 Prisma mock。
  const service = new WorkerService(prisma);
  return { service, prisma };
}

const baseCreateDto: CreateWorkerDto = {
  employeeNo: 'WK0001',
  password: '13900000000',
  name: '测试员工',
  phone: '13900000000',
  skillType: 'CLEANING',
};

describe('WorkerService 技能证书多图', () => {
  it('新增时支持 0 张技能证书', async () => {
    const { service, prisma } = makeService();

    await service.create(baseCreateDto);

    expect(prisma.worker.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ skillCertUrls: expect.anything() }),
    });
  });

  it('新增 1 张时写入 JSON 数组并同步旧字段', async () => {
    const row = makeWorkerRow({
      skillCertUrl: CERT_URLS[0],
      skillCertUrls: [CERT_URLS[0]],
    });
    const { service, prisma } = makeService(row);

    const result = await service.create({
      ...baseCreateDto,
      skillCertUrls: [CERT_URLS[0]],
    });

    expect(prisma.worker.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        skillCertUrls: [CERT_URLS[0]],
        skillCertUrl: CERT_URLS[0],
      }),
    });
    expect(result?.skillCertUrls).toEqual([CERT_URLS[0]]);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('新增 9 张时完整写入且旧字段取首张', async () => {
    const { service, prisma } = makeService(
      makeWorkerRow({ skillCertUrl: CERT_URLS[0], skillCertUrls: CERT_URLS }),
    );

    await service.create({ ...baseCreateDto, skillCertUrls: CERT_URLS });

    expect(prisma.worker.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        skillCertUrls: CERT_URLS,
        skillCertUrl: CERT_URLS[0],
      }),
    });
  });

  it('旧客户端仅传单图时自动同步为数组', async () => {
    const { service, prisma } = makeService();

    await service.create({ ...baseCreateDto, skillCertUrl: CERT_URLS[0] });

    expect(prisma.worker.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        skillCertUrls: [CERT_URLS[0]],
        skillCertUrl: CERT_URLS[0],
      }),
    });
  });

  it('编辑可替换证书数组并同步首张', async () => {
    const nextUrls = CERT_URLS.slice(2, 5);
    const { service, prisma } = makeService(
      makeWorkerRow({ skillCertUrl: nextUrls[0], skillCertUrls: nextUrls }),
    );

    await service.update(1, { skillCertUrls: nextUrls });

    expect(prisma.worker.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        skillCertUrls: nextUrls,
        skillCertUrl: nextUrls[0],
      }),
    });
  });

  it('编辑传空数组时清空新旧字段', async () => {
    const { service, prisma } = makeService(
      makeWorkerRow({ skillCertUrl: null, skillCertUrls: [] }),
    );

    await service.update(1, { skillCertUrls: [] });

    expect(prisma.worker.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        skillCertUrls: [],
        skillCertUrl: null,
      }),
    });
  });

  it('历史记录仅有旧字段时，详情回退为单元素数组', async () => {
    const { service } = makeService(
      makeWorkerRow({ skillCertUrl: CERT_URLS[0], skillCertUrls: null }),
    );

    const result = await service.findOne(1);

    expect(result.skillCertUrls).toEqual([CERT_URLS[0]]);
  });

  it('新数组存在时优先于旧字段', async () => {
    const { service } = makeService(
      makeWorkerRow({
        skillCertUrl: 'http://localhost:3000/uploads/legacy.jpg',
        skillCertUrls: CERT_URLS.slice(0, 2),
      }),
    );

    const result = await service.findOne(1);

    expect(result.skillCertUrls).toEqual(CERT_URLS.slice(0, 2));
  });

  it('异常 JSON 历史值被安全忽略并回退旧字段', async () => {
    const { service } = makeService(
      makeWorkerRow({
        skillCertUrl: CERT_URLS[0],
        skillCertUrls: { unexpected: true },
      }),
    );

    const result = await service.findOne(1);

    expect(result.skillCertUrls).toEqual([CERT_URLS[0]]);
  });

  it('Prisma 未知异常保持原样抛出', async () => {
    const { service, prisma } = makeService();
    const databaseError = new Error('database unavailable');
    prisma.worker.create.mockRejectedValueOnce(databaseError);

    await expect(service.create(baseCreateDto)).rejects.toBe(databaseError);
  });
});

describe('CreateWorkerDto 技能证书数组校验', () => {
  async function validateUrls(skillCertUrls: unknown) {
    const dto = plainToInstance(CreateWorkerDto, {
      ...baseCreateDto,
      skillCertUrls,
    });
    return validate(dto);
  }

  it('0、1、9 张均通过校验', async () => {
    await expect(validateUrls([])).resolves.toHaveLength(0);
    await expect(validateUrls(CERT_URLS.slice(0, 1))).resolves.toHaveLength(0);
    await expect(validateUrls(CERT_URLS)).resolves.toHaveLength(0);
  });

  it('第 10 张被拒绝', async () => {
    const errors = await validateUrls([
      ...CERT_URLS,
      'http://localhost:3000/uploads/skill-10.jpg',
    ]);

    expect(errors.some((error) => error.property === 'skillCertUrls')).toBe(true);
  });

  it('非数组和非字符串元素被拒绝', async () => {
    await expect(validateUrls('not-an-array')).resolves.not.toHaveLength(0);
    await expect(validateUrls([CERT_URLS[0], 123])).resolves.not.toHaveLength(0);
  });

  it('非法 URL 被拒绝', async () => {
    await expect(validateUrls(['not-a-url'])).resolves.not.toHaveLength(0);
  });
});
