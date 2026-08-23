import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { ReviewKeywordController } from './review-keyword.controller';

const item = {
  id: 1,
  bizType: 'CLEANING' as const,
  keyword: '准时到达',
  sortOrder: 1,
  isEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const makeService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  toggle: jest.fn(),
});

describe('ReviewKeywordController', () => {
  let service: ReturnType<typeof makeService>;
  let controller: ReviewKeywordController;

  beforeEach(() => {
    service = makeService();
    controller = new ReviewKeywordController(service as any);
  });

  it('create 返回统一响应结构', async () => {
    service.create.mockResolvedValue(item);
    await expect(
      controller.create({ bizType: 'CLEANING', keyword: '准时到达', sortOrder: 1 }),
    ).resolves.toEqual({ code: 0, message: 'ok', data: item });
  });

  it('findAll 返回统一分页响应结构', async () => {
    const page = { items: [item], total: 1, page: 1, pageSize: 10 };
    service.findAll.mockResolvedValue(page);
    await expect(controller.findAll({ page: 1, pageSize: 10 })).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: page,
    });
  });

  it('findOne 透传数字 ID', async () => {
    service.findOne.mockResolvedValue(item);
    await controller.findOne(1);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('update 透传 ID 和更新内容', async () => {
    service.update.mockResolvedValue({ ...item, sortOrder: 2 });
    await controller.update(1, { sortOrder: 2 });
    expect(service.update).toHaveBeenCalledWith(1, { sortOrder: 2 });
  });

  it('remove 返回删除结果', async () => {
    service.remove.mockResolvedValue({ id: 1 });
    await expect(controller.remove(1)).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: { id: 1 },
    });
  });

  it('toggle 返回切换后的配置', async () => {
    service.toggle.mockResolvedValue({ ...item, isEnabled: false });
    const result = await controller.toggle(1);
    expect(result.data).toMatchObject({ id: 1, isEnabled: false });
  });

  it.each(['create', 'update', 'remove', 'toggle'] as const)(
    '%s 写接口受管理员 JWT 保护',
    (methodName) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller[methodName]);
      expect(guards).toContain(AdminJwtAuthGuard);
    },
  );

  it.each(['findAll', 'findOne'] as const)('%s 读接口保持公开', (methodName) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller[methodName]);
    expect(guards).toBeUndefined();
  });
});
