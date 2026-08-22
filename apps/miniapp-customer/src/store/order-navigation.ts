import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 居民端订单业务类型，与订单列表页签及详情页 type 参数保持一致。 */
export type CustomerOrderType = 'cleaning' | 'recycling' | 'consult';

/**
 * 跨页面传递订单列表待选页签。
 *
 * tabBar 页面无法通过 switchTab 携带 query，因此使用一次性状态，
 * 确保新建订单详情返回后展示对应业务分类。
 */
export const useOrderNavigationStore = defineStore('orderNavigation', () => {
  const pendingOrderTab = ref<CustomerOrderType | null>(null);

  function prepareOrderTab(tab: CustomerOrderType) {
    pendingOrderTab.value = tab;
    console.info('[order-navigation-store] prepared tab=', tab);
  }

  function consumeOrderTab(): CustomerOrderType | null {
    const tab = pendingOrderTab.value;
    pendingOrderTab.value = null;
    if (tab) {
      console.info('[order-navigation-store] consumed tab=', tab);
    }
    return tab;
  }

  return {
    pendingOrderTab,
    prepareOrderTab,
    consumeOrderTab,
  };
});
