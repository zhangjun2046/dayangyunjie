import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PENDING_RESIDENT_LINK_STORAGE_KEY,
  parseResidentDeepLink,
  parseResidentDeepLinkUrl,
  peekPendingResidentDeepLink,
  residentDeepLinkUrl,
  savePendingResidentDeepLink,
} from './resident-deeplink';

describe('resident-deeplink', () => {
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
      parseResidentDeepLink('pages/order-detail/index', { id: '11', type: 'cleaning' }),
    ).toEqual({ kind: 'detail', orderId: 11, orderType: 'cleaning' });
    expect(
      parseResidentDeepLink('/pages/order-detail/index', { id: '8', type: 'RECYCLING' }),
    ).toEqual({ kind: 'detail', orderId: 8, orderType: 'recycling' });
    expect(parseResidentDeepLinkUrl('pages/order-detail/index?id=11&type=cleaning')).toEqual({
      kind: 'detail',
      orderId: 11,
      orderType: 'cleaning',
    });
  });

  it('评价页用 orderId / orderType（大写 CLEANING|RECYCLING）', () => {
    expect(
      parseResidentDeepLink('pages/review/index', { orderId: '11', orderType: 'CLEANING' }),
    ).toEqual({ kind: 'review', orderId: 11, orderType: 'CLEANING' });
    expect(
      parseResidentDeepLink('pages/review/index', { orderId: '9', orderType: 'recycling' }),
    ).toEqual({ kind: 'review', orderId: 9, orderType: 'RECYCLING' });
    expect(parseResidentDeepLinkUrl('pages/review/index?orderId=11&orderType=CLEANING')).toEqual({
      kind: 'review',
      orderId: 11,
      orderType: 'CLEANING',
    });
  });

  it('家政咨询或首页不当成通知深链', () => {
    expect(parseResidentDeepLink('pages/order-detail/index', { id: '1', type: 'consult' })).toBeNull();
    expect(parseResidentDeepLink('pages/index/index', { id: '1', type: 'cleaning' })).toBeNull();
    expect(parseResidentDeepLink('pages/review/index', { orderId: '1' })).toBeNull();
  });

  it('小程序内跳转带前导斜杠，与 OA pagepath 不同', () => {
    expect(residentDeepLinkUrl({ kind: 'detail', orderId: 12, orderType: 'recycling' })).toBe(
      '/pages/order-detail/index?id=12&type=recycling',
    );
    expect(residentDeepLinkUrl({ kind: 'review', orderId: 12, orderType: 'CLEANING' })).toBe(
      '/pages/review/index?orderId=12&orderType=CLEANING',
    );
  });

  it('pending 可写入并读出', () => {
    savePendingResidentDeepLink({ kind: 'detail', orderId: 8, orderType: 'cleaning' });
    expect(peekPendingResidentDeepLink()).toEqual({
      kind: 'detail',
      orderId: 8,
      orderType: 'cleaning',
    });
    expect(memory.get(PENDING_RESIDENT_LINK_STORAGE_KEY)).toContain('8');
  });
});
