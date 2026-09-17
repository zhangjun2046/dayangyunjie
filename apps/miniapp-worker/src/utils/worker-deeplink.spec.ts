import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PENDING_WORKER_TASK_STORAGE_KEY,
  parseWorkerTaskDeepLink,
  parseWorkerTaskQuery,
  parseWorkerTaskUrl,
  peekPendingWorkerTask,
  savePendingWorkerTask,
  workerTaskDetailUrl,
} from './worker-deeplink';

describe('worker-deeplink', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('uni', {
      getStorageSync: (key: string) => memory.get(key) ?? '',
      setStorageSync: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeStorageSync: (key: string) => {
        memory.delete(key);
      },
    });
    vi.stubGlobal('getCurrentPages', () => []);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('解析服务号 pagepath 同款 query：orderId + orderType', () => {
    expect(
      parseWorkerTaskDeepLink('pages/task-detail/index', { orderId: '12', orderType: 'cleaning' }),
    ).toEqual({ orderId: 12, orderType: 'cleaning' });
    expect(
      parseWorkerTaskDeepLink('/pages/task-detail/index', { orderId: '3', orderType: 'RECYCLING' }),
    ).toEqual({ orderId: 3, orderType: 'recycling' });
    expect(parseWorkerTaskUrl('pages/task-detail/index?orderId=11&orderType=cleaning')).toEqual({
      orderId: 11,
      orderType: 'cleaning',
    });
  });

  it('首页或缺少参数不当成任务深链', () => {
    expect(parseWorkerTaskDeepLink('pages/index/index', { orderId: '12', orderType: 'cleaning' })).toBeNull();
    expect(parseWorkerTaskQuery({ orderId: '12' })).toBeNull();
    expect(parseWorkerTaskQuery({ orderId: 'abc', orderType: 'cleaning' })).toBeNull();
  });

  it('小程序内跳转 URL 带前导斜杠，与 OA pagepath 不同', () => {
    expect(workerTaskDetailUrl({ orderId: 12, orderType: 'recycling' })).toBe(
      '/pages/task-detail/index?orderId=12&orderType=recycling',
    );
  });

  it('pending 可写入并读出', () => {
    savePendingWorkerTask({ orderId: 8, orderType: 'cleaning' });
    expect(peekPendingWorkerTask()).toEqual({ orderId: 8, orderType: 'cleaning' });
    expect(memory.get(PENDING_WORKER_TASK_STORAGE_KEY)).toContain('8');
  });
});
