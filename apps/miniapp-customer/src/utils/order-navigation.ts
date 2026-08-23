import {
  useOrderNavigationStore,
  type CustomerOrderType,
} from '@/store/order-navigation';

const ORDER_LIST_URL = '/pages/orders/index';

/**
 * 打开刚创建的订单详情，并保留“详情返回订单列表”的页面栈。
 *
 * 订单列表是 tabBar 页面，必须先 switchTab，再从成功回调进入非 tabBar 详情页。
 */
export function openCreatedOrderDetail(
  orderId: number,
  orderType: CustomerOrderType,
): void {
  const navigationStore = useOrderNavigationStore();
  navigationStore.prepareOrderTab(orderType);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    console.info('[order-navigation] invalid created order id=', orderId);
    uni.showToast({ title: '订单信息异常，请到订单列表查看', icon: 'none' });
    uni.switchTab({ url: ORDER_LIST_URL });
    return;
  }

  const detailUrl = `/pages/order-detail/index?id=${orderId}&type=${orderType}`;
  const navigateToDetail = () => {
    uni.navigateTo({
      url: detailUrl,
      fail: (error) => {
        console.info('[order-navigation] open detail failed', error);
        uni.showToast({ title: '详情打开失败，请在订单列表查看', icon: 'none' });
      },
    });
  };

  uni.switchTab({
    url: ORDER_LIST_URL,
    success: () => {
      console.info('[order-navigation] order tab opened, detail=', detailUrl);
      navigateToDetail();
    },
    fail: (error) => {
      // 极端情况下保留“查看新订单”的核心目标；详情返回仍有订单页兜底。
      console.info('[order-navigation] switch order tab failed, open detail directly', error);
      navigateToDetail();
    },
  });
}
