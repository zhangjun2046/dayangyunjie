import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useOrderNavigationStore } from '@/store/order-navigation';
import { openCreatedOrderDetail } from './order-navigation';

interface NavigationOptions {
  url: string;
  success?: () => void;
  fail?: (error: unknown) => void;
}

describe('openCreatedOrderDetail', () => {
  const switchTab = vi.fn();
  const navigateTo = vi.fn();
  const showToast = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    switchTab.mockReset();
    navigateTo.mockReset();
    showToast.mockReset();
    vi.stubGlobal('uni', { switchTab, navigateTo, showToast });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['cleaning', 101],
    ['recycling', 202],
    ['consult', 303],
  ] as const)('先切换订单页再打开 %s 详情', (type, orderId) => {
    switchTab.mockImplementation((options: NavigationOptions) => options.success?.());

    openCreatedOrderDetail(orderId, type);

    expect(switchTab).toHaveBeenCalledWith(expect.objectContaining({
      url: '/pages/orders/index',
    }));
    expect(navigateTo).toHaveBeenCalledWith(expect.objectContaining({
      url: `/pages/order-detail/index?id=${orderId}&type=${type}`,
    }));
    expect(useOrderNavigationStore().consumeOrderTab()).toBe(type);
    expect(useOrderNavigationStore().consumeOrderTab()).toBeNull();
  });

  it('订单 ID 无效时提示并降级到对应分类的订单列表', () => {
    openCreatedOrderDetail(0, 'recycling');

    expect(showToast).toHaveBeenCalledWith({
      title: '订单信息异常，请到订单列表查看',
      icon: 'none',
    });
    expect(switchTab).toHaveBeenCalledWith({ url: '/pages/orders/index' });
    expect(navigateTo).not.toHaveBeenCalled();
    expect(useOrderNavigationStore().consumeOrderTab()).toBe('recycling');
  });

  it('订单页切换失败时仍尝试直接打开新订单详情', () => {
    switchTab.mockImplementation((options: NavigationOptions) => {
      options.fail?.(new Error('switch failed'));
    });

    openCreatedOrderDetail(404, 'consult');

    expect(navigateTo).toHaveBeenCalledWith(expect.objectContaining({
      url: '/pages/order-detail/index?id=404&type=consult',
    }));
  });

  it('详情打开失败时提示用户从订单列表查看', () => {
    switchTab.mockImplementation((options: NavigationOptions) => options.success?.());
    navigateTo.mockImplementation((options: NavigationOptions) => {
      options.fail?.(new Error('navigate failed'));
    });

    openCreatedOrderDetail(505, 'cleaning');

    expect(showToast).toHaveBeenCalledWith({
      title: '详情打开失败，请在订单列表查看',
      icon: 'none',
    });
  });
});
