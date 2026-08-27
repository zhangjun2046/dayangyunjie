import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkerEmploymentStatus } from '@prisma/client';

type AssignableWorker = {
  id: number;
  employmentStatus: WorkerEmploymentStatus;
};

/** 派单/改派前校验：员工存在且在职。 */
export function assertWorkerAssignable(
  worker: AssignableWorker | null,
  workerId: number,
): asserts worker is AssignableWorker {
  if (!worker) {
    throw new NotFoundException(`Worker ${workerId} not found`);
  }
  if (worker.employmentStatus === WorkerEmploymentStatus.RESIGNED) {
    throw new BadRequestException('离职员工不可派单');
  }
}
