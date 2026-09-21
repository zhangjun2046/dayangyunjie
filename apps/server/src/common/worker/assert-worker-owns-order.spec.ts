import { ForbiddenException } from '@nestjs/common';
import { WORKER_TASK_REASSIGNED_MESSAGE } from '@dayangyunjie/shared';
import { assertWorkerOwnsOrder } from './assert-worker-owns-order';

describe('assertWorkerOwnsOrder', () => {
  it('当前员工即派单对象时通过', () => {
    expect(() => assertWorkerOwnsOrder(3, 3)).not.toThrow();
  });

  it('已改派或其他员工查看时抛出固定中文文案', () => {
    expect(() => assertWorkerOwnsOrder(4, 3)).toThrow(ForbiddenException);
    try {
      assertWorkerOwnsOrder(4, 3);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toBe(WORKER_TASK_REASSIGNED_MESSAGE);
    }
  });
});
