import { describe, expect, it } from 'vitest';
import { WORKER_TASK_REASSIGNED_HINT, WORKER_TASK_REASSIGNED_MESSAGE } from '@dayangyunjie/shared';
import {
  shouldToastWorkerTaskLoadError,
  WORKER_TASK_LOAD_FAILED_MESSAGE,
  workerTaskLoadErrorCopy,
} from './worker-task-load-error';

describe('workerTaskLoadErrorCopy', () => {
  it('已改派用页面主副文案，不 toast', () => {
    expect(workerTaskLoadErrorCopy(WORKER_TASK_REASSIGNED_MESSAGE)).toEqual({
      title: WORKER_TASK_REASSIGNED_MESSAGE,
      sub: WORKER_TASK_REASSIGNED_HINT,
    });
    expect(shouldToastWorkerTaskLoadError(WORKER_TASK_REASSIGNED_MESSAGE)).toBe(false);
  });

  it('单不存在或网络错误用通用失败文案，仍 toast', () => {
    expect(workerTaskLoadErrorCopy('CleaningOrder 10 not found')).toEqual({
      title: WORKER_TASK_LOAD_FAILED_MESSAGE,
    });
    expect(workerTaskLoadErrorCopy()).toEqual({ title: WORKER_TASK_LOAD_FAILED_MESSAGE });
    expect(shouldToastWorkerTaskLoadError('CleaningOrder 10 not found')).toBe(true);
  });
});
