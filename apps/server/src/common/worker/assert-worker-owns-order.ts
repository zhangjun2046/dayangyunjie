import { ForbiddenException } from '@nestjs/common';
import { WORKER_TASK_REASSIGNED_MESSAGE } from '@dayangyunjie/shared';

/** 员工查看详情：单还在但不属于当前员工（含改派后点旧服务号消息）。 */
export function assertWorkerOwnsOrder(
  orderWorkerId: number | null | undefined,
  viewerId?: number,
): void {
  if (orderWorkerId !== viewerId) {
    throw new ForbiddenException(WORKER_TASK_REASSIGNED_MESSAGE);
  }
}
