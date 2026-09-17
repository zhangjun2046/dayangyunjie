import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PENDING_ADMIN_ORDER_STORAGE_KEY,
  parseAdminOrderDeepLink,
  parseAdminOrderUrl,
  peekPendingAdminOrder,
  savePendingAdminOrder,
  adminOrderDetailUrl,
} from './admin-deeplink';

describe('admin-deeplink', () => {
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

  it('详情页用 id / type（小写 cleaning|recycling）', () => {
    expect(
      parseAdminOrderDeepLink('pages/order-detail/index', { id: '11', type: 'cleaning' }),
    ).toEqual({ orderId: 11, orderType: 'cleaning' });
    expect(
      parseAdminOrderUrl(
        'https://h5.yunjiezhixiang.cn/#/pages/order-detail/index?id=8&type=recycling',
      ),
    ).toEqual({ orderId: 8, orderType: 'recycling' });
    expect(adminOrderDetailUrl({ orderId: 8, orderType: 'recycling' })).toBe(
      '/pages/order-detail/index?id=8&type=recycling',
    );
  });

  it('咨询单或缺少参数不当成订单深链', () => {
    expect(parseAdminOrderDeepLink('pages/order-detail/index', { id: '1', type: 'consult' })).toBeNull();
    expect(parseAdminOrderDeepLink('pages/orders/index', { id: '1', type: 'cleaning' })).toBeNull();
    expect(parseAdminOrderUrl('https://evil.example/#/pages/order-detail/index?id=1&type=cleaning')).toEqual({
      orderId: 1,
      orderType: 'cleaning',
    });
  });

  it('pending 可写入并读出', () => {
    savePendingAdminOrder({ orderId: 8, orderType: 'cleaning' });
    expect(peekPendingAdminOrder()).toEqual({ orderId: 8, orderType: 'cleaning' });
    expect(memory.get(PENDING_ADMIN_ORDER_STORAGE_KEY)).toContain('8');
  });
});
