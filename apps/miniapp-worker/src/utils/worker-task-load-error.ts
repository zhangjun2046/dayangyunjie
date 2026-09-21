import {
  WORKER_TASK_REASSIGNED_HINT,
  WORKER_TASK_REASSIGNED_MESSAGE,
} from '@dayangyunjie/shared';

export const WORKER_TASK_LOAD_FAILED_MESSAGE = '订单加载失败，请返回重试';

export type WorkerTaskLoadErrorCopy = {
  title: string;
  sub?: string;
};

export function workerTaskLoadErrorCopy(message?: string): WorkerTaskLoadErrorCopy {
  if (message === WORKER_TASK_REASSIGNED_MESSAGE) {
    return {
      title: WORKER_TASK_REASSIGNED_MESSAGE,
      sub: WORKER_TASK_REASSIGNED_HINT,
    };
  }
  return { title: WORKER_TASK_LOAD_FAILED_MESSAGE };
}

export function shouldToastWorkerTaskLoadError(message?: string): boolean {
  return message !== WORKER_TASK_REASSIGNED_MESSAGE;
}
