import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { RecyclingItemController } from './recycling-item.controller';

describe('RecyclingItemController', () => {
  const service = {
    create: jest.fn(),
    findEnabled: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
  };
  const controller = new RecyclingItemController(service as any);

  it.each(['create', 'update', 'remove', 'toggle'] as const)('%s 受管理员 JWT 保护', (methodName) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller[methodName]);
    expect(guards).toContain(AdminJwtAuthGuard);
  });

  it.each(['findEnabled', 'findAll', 'findOne'] as const)('%s 保持公开', (methodName) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller[methodName])).toBeUndefined();
  });
});
