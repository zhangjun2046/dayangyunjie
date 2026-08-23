import { ParseIntPipe } from '@nestjs/common';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { ComplaintReasonConfigController } from './complaint-reason-config.controller';

const item = {
  id: 2,
  label: '打扫不干净',
  sortOrder: 2,
  isEnabled: true,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const makeService = () => ({
  create: jest.fn(),
  findEnabled: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  toggle: jest.fn(),
  remove: jest.fn(),
});

type PathMethod = 'update' | 'toggle' | 'remove';

function getIdPipe(methodName: PathMethod): ParseIntPipe {
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    ComplaintReasonConfigController,
    methodName,
  ) as Record<string, { pipes?: unknown[] }>;
  const pipeType = Object.values(metadata)
    .flatMap(({ pipes = [] }) => pipes)
    .find((candidate) => candidate === ParseIntPipe);
  if (!pipeType) throw new Error(`${methodName} ParseIntPipe metadata not found`);
  return new ParseIntPipe();
}

describe('ComplaintReasonConfigController', () => {
  let service: ReturnType<typeof makeService>;
  let controller: ComplaintReasonConfigController;

  beforeEach(() => {
    service = makeService();
    controller = new ComplaintReasonConfigController(service as any);
  });

  it('CRUD 和切换接口返回统一响应结构', async () => {
    service.create.mockResolvedValue(item);
    service.update.mockResolvedValue(item);
    service.toggle.mockResolvedValue({ ...item, isEnabled: false });
    service.remove.mockResolvedValue({ id: 2 });

    await expect(controller.create({ label: '打扫不干净' })).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: item,
    });
    await expect(controller.update(2, { sortOrder: 1 })).resolves.toMatchObject({ code: 0 });
    await expect(controller.toggle(2)).resolves.toMatchObject({ code: 0 });
    await expect(controller.remove(2)).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: { id: 2 },
    });
  });

  it.each(['create', 'findAll', 'update', 'toggle', 'remove'] as const)(
    '%s 受管理员 JWT 保护',
    (methodName) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller[methodName]);
      expect(guards).toContain(AdminJwtAuthGuard);
    },
  );

  it('findEnabled 保持公开', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller.findEnabled)).toBeUndefined();
  });

  it.each(['update', 'toggle', 'remove'] as const)(
    '%s 的 id 参数使用整数解析管道',
    async (methodName) => {
      const pipe = getIdPipe(methodName);
      await expect(pipe.transform('invalid', { type: 'param', data: 'id' })).rejects.toMatchObject({
        status: 400,
      });
      await expect(pipe.transform('2', { type: 'param', data: 'id' })).resolves.toBe(2);
    },
  );
});
