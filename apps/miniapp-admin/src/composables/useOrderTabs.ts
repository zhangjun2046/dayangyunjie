/**
 * 按功能授权计算订单页业务 Tab。
 * 本端只认 orders.cleaning / orders.recycling。
 */

import { computed, ref } from 'vue';
import { useAuthStore } from '@/store/auth';

export type OrderTab = 'cleaning' | 'recycling';

const TAB_STORAGE_KEY = '__admin_order_tab__';

const TAB_DEFS: ReadonlyArray<{ value: OrderTab; label: string; menuKey: string }> = [
  { value: 'cleaning', label: '保洁', menuKey: 'orders.cleaning' },
  { value: 'recycling', label: '废品回收', menuKey: 'orders.recycling' },
];

function readRemembered(): OrderTab | null {
  try {
    const raw = uni.getStorageSync(TAB_STORAGE_KEY);
    if (raw === 'cleaning' || raw === 'recycling') return raw;
  } catch {
    // ignore
  }
  return null;
}

function persistTab(tab: OrderTab): void {
  uni.setStorageSync(TAB_STORAGE_KEY, tab);
}

export function useOrderTabs() {
  const authStore = useAuthStore();
  const activeTab = ref<OrderTab | null>(null);

  const visibleTabs = computed(() =>
    TAB_DEFS.filter((tab) => authStore.hasMenu(tab.menuKey)).map((tab) => ({
      value: tab.value,
      label: tab.label,
    })),
  );

  const showTabBar = computed(() => visibleTabs.value.length === 2);

  function pickDefault(visible: OrderTab[]): OrderTab | null {
    if (visible.length === 0) return null;
    const remembered = readRemembered();
    if (remembered && visible.includes(remembered)) return remembered;
    if (visible.includes('cleaning')) return 'cleaning';
    return visible[0] ?? null;
  }

  /** 根据当前 store 权限校正 activeTab；当前 Tab 已无权限则按保洁优先重选 */
  function syncFromPermissions(): void {
    const visible = visibleTabs.value.map((tab) => tab.value);
    if (activeTab.value && visible.includes(activeTab.value)) {
      persistTab(activeTab.value);
      return;
    }
    const next = pickDefault(visible);
    activeTab.value = next;
    if (next) persistTab(next);
    else uni.removeStorageSync(TAB_STORAGE_KEY);
    console.info('[order-tabs] sync', { visible, activeTab: activeTab.value });
  }

  function selectTab(tab: OrderTab): void {
    if (activeTab.value === tab) return;
    if (!visibleTabs.value.some((item) => item.value === tab)) return;
    activeTab.value = tab;
    persistTab(tab);
  }

  function snapshotVisibleKeys(): OrderTab[] {
    return visibleTabs.value.map((tab) => tab.value);
  }

  return {
    visibleTabs,
    showTabBar,
    activeTab,
    syncFromPermissions,
    selectTab,
    snapshotVisibleKeys,
  };
}

const TAB_LABEL: Record<OrderTab, string> = {
  cleaning: '保洁',
  recycling: '废品',
};

/** 结构真变了才 toast；没变不提示。 */
export function notifyPermissionChange(
  prev: OrderTab[],
  prevActive: OrderTab | null,
  next: OrderTab[],
): void {
  const nextSet = new Set(next);
  const same = prev.length === next.length && prev.every((tab) => nextSet.has(tab));
  if (same) return;

  if (next.length === 0) {
    uni.showToast({ title: '订单查看权限已取消', icon: 'none' });
    return;
  }

  if (prev.length === 2 && next.length === 1) {
    if (prevActive && !nextSet.has(prevActive)) {
      uni.showToast({
        title: `您的${TAB_LABEL[prevActive]}订单权限已取消`,
        icon: 'none',
      });
    }
    return;
  }

  if (prev.length === 1 && next.length === 1 && prev[0] !== next[0]) {
    uni.showToast({ title: '订单权限已变更', icon: 'none' });
  }
}
