<template>
  <view class="page">
    <!-- 顶部 Tab：保洁 / 废品 / 家政 -->
    <view class="top-tabs">
      <view
        v-for="tab in TABS"
        :key="tab.key"
        class="top-tab-item"
        :class="{ 'tab-active': activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="top-tab-text">{{ tab.label }}</text>
        <view v-if="activeTab === tab.key" class="tab-underline" />
      </view>
    </view>

    <!-- 状态筛选胶囊 -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-row">
        <view
          v-for="filter in currentFilters"
          :key="filter.key"
          class="filter-pill"
          :class="{ 'pill-active': activeFilter === filter.key }"
          @tap="switchFilter(filter.key)"
        >
          <text>{{ filter.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 订单列表 -->
    <scroll-view
      class="order-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onPullRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 加载中骨架 -->
      <view v-if="loading && orders.length === 0" class="loading-wrap">
        <text class="loading-text">加载中…</text>
      </view>

      <!-- 未登录提示 -->
      <view v-else-if="notLoggedIn" class="empty-wrap">
        <text class="empty-icon">🔒</text>
        <text class="empty-text">请先登录后查看订单</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && orders.length === 0" class="empty-wrap">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无订单</text>
      </view>

      <!-- 订单卡片列表 -->
      <view v-else class="card-list">
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @tap="goToDetail(order)"
        >
          <!-- 卡片头：服务项 + 状态徽标 -->
          <view class="card-header">
            <text class="card-service">{{ getServiceLabel(order) }}</text>
            <view class="status-badge" :class="getStatusClass(order.status)">
              <text class="badge-text">{{ getStatusLabel(order.status, activeTab) }}</text>
            </view>
          </view>

          <!-- 订单号 -->
          <text class="card-order-no">{{ order.orderNo }}</text>

          <!-- 时间 -->
          <view class="card-info-row" v-if="getAppointInfo(order)">
            <text class="info-icon">🗓</text>
            <text class="info-text">{{ getAppointInfo(order) }}</text>
          </view>

          <!-- 地址（保洁/废品有） -->
          <view class="card-info-row" v-if="getAddressText(order)">
            <text class="info-icon">📍</text>
            <text class="info-text">{{ getAddressText(order) }}</text>
          </view>

          <!-- 家政咨询：需求描述摘要 -->
          <view class="card-info-row" v-if="activeTab === 'consult' && (order as ConsultOrderDto).requirementDesc">
            <text class="info-icon">📝</text>
            <text class="info-text desc-truncate">{{ (order as ConsultOrderDto).requirementDesc }}</text>
          </view>

          <!-- 代下单标记 -->
          <view v-if="order.isProxyOrder" class="proxy-tag">
            <text>代下单</text>
          </view>

          <!-- 箭头 -->
          <view class="card-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <!-- 上拉加载更多 -->
      <view v-if="orders.length > 0 && !noMore" class="load-more">
        <text>{{ loadingMore ? '加载中…' : '上拉加载更多' }}</text>
      </view>
      <view v-if="noMore && orders.length > 0" class="load-more">
        <text class="no-more-text">已全部加载</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchCleaningOrderList,
  type CleaningOrderDto,
} from '@/api/cleaning-order';
import {
  fetchRecyclingOrderList,
  type RecyclingOrderDto,
} from '@/api/recycling-order';
import {
  fetchConsultOrderList,
  type ConsultOrderDto,
} from '@/api/consult-order';

console.info('[orders] page loaded');

type TabKey = 'cleaning' | 'recycling' | 'consult';
type AnyOrder = (CleaningOrderDto | RecyclingOrderDto | ConsultOrderDto) & {
  id: number;
  orderNo: string;
  status: string;
  isProxyOrder?: boolean;
};

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'cleaning', label: '保洁服务' },
  { key: 'recycling', label: '废品回收' },
  { key: 'consult', label: '家政服务' },
];

/** 保洁/废品状态筛选 */
const FILTERS_MAIN = [
  { key: '', label: '全部' },
  { key: 'PENDING_ASSIGN,ASSIGNED,ACCEPTED', label: '待服务' },
  { key: 'IN_SERVICE', label: '进行中' },
  { key: 'PENDING_REVIEW', label: '待反馈' },
  { key: 'REVIEWED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
];

/** 家政咨询状态筛选 */
const FILTERS_CONSULT = [
  { key: '', label: '全部' },
  { key: 'FOLLOW_UP', label: '待跟进' },
  { key: 'FOLLOWING', label: '跟进中' },
  { key: 'COMPLETED', label: '已完成' },
];

const authStore = useAuthStore();
const activeTab = ref<TabKey>('cleaning');
const activeFilter = ref<string>('');
const orders = ref<AnyOrder[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const noMore = ref(false);
const currentPage = ref(1);
const PAGE_SIZE = 10;
const notLoggedIn = ref(false);

const currentFilters = computed(() =>
  activeTab.value === 'consult' ? FILTERS_CONSULT : FILTERS_MAIN,
);

function switchTab(tab: TabKey) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  activeFilter.value = '';
}

function switchFilter(key: string) {
  if (activeFilter.value === key) return;
  activeFilter.value = key;
}

watch([activeTab, activeFilter], () => {
  resetAndLoad();
});

onMounted(() => {
  resetAndLoad();
});

// 每次页面重新显示时刷新列表（如从订单详情/评价页返回后状态已更新）
onShow(() => {
  console.info('[orders] onShow → refresh list');
  // #region agent log
  fetch('http://127.0.0.1:7274/ingest/fee21d48-4d03-4852-be1e-1872cabcbb9a', {method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59cbfd'},body:JSON.stringify({sessionId:'59cbfd',location:'orders/index.vue:onShow',message:'orders onShow fired',data:{activeTab:activeTab.value,activeFilter:activeFilter.value,ordersCount:orders.value.length},hypothesisId:'C',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  resetAndLoad();
});

function resetAndLoad() {
  orders.value = [];
  currentPage.value = 1;
  noMore.value = false;
  loadData(false);
}

async function loadData(isMore: boolean) {
  const residentId = authStore.resident?.id;

  // 若未登录，显示提示而非静默空列表
  if (!residentId) {
    notLoggedIn.value = true;
    loading.value = false;
    console.info('[orders] loadData skipped: no residentId, isLoggedIn=', authStore.isLoggedIn, 'resident=', authStore.resident);
    return;
  }

  notLoggedIn.value = false;

  if (isMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const page = isMore ? currentPage.value : 1;
    const filterKey = activeFilter.value;

    console.info(`[orders] loadData tab=${activeTab.value} filter="${filterKey}" residentId=${residentId} page=${page}`);

    let result: { items: AnyOrder[]; total: number };

    if (activeTab.value === 'cleaning') {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (filterKey.includes(',')) {
        params.statuses = filterKey;
      } else if (filterKey) {
        params.status = filterKey;
      }
      result = await fetchCleaningOrderList(params as Parameters<typeof fetchCleaningOrderList>[0]);
    } else if (activeTab.value === 'recycling') {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (filterKey.includes(',')) {
        params.statuses = filterKey;
      } else if (filterKey) {
        params.status = filterKey;
      }
      result = await fetchRecyclingOrderList(params as Parameters<typeof fetchRecyclingOrderList>[0]);
    } else {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (filterKey) {
        params.status = filterKey;
      }
      result = await fetchConsultOrderList(params as Parameters<typeof fetchConsultOrderList>[0]);
    }

    const newItems = result.items as AnyOrder[];
    if (isMore) {
      orders.value = [...orders.value, ...newItems];
    } else {
      orders.value = newItems;
    }

    // #region agent log
    fetch('http://127.0.0.1:7274/ingest/fee21d48-4d03-4852-be1e-1872cabcbb9a', {method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'59cbfd'},body:JSON.stringify({sessionId:'59cbfd',location:'orders/index.vue:loadData',message:'orders loaded - statuses',data:{tab:activeTab.value,filter:filterKey,statuses:newItems.map((o:AnyOrder)=>({id:o.id,status:o.status}))},hypothesisId:'C',timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    noMore.value = orders.value.length >= result.total;
    if (!noMore.value) {
      currentPage.value = page + 1;
    }

    console.info(`[orders] loaded tab=${activeTab.value} filter="${filterKey}" residentId=${residentId} → count=${result.items.length} total=${result.total}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[orders] loadData error:', e);
  } finally {
    loading.value = false;
    loadingMore.value = false;
    refreshing.value = false;
  }
}

function onPullRefresh() {
  refreshing.value = true;
  orders.value = [];
  currentPage.value = 1;
  noMore.value = false;
  loadData(false);
}

function onLoadMore() {
  if (noMore.value || loadingMore.value) return;
  loadData(true);
}

function goToDetail(order: AnyOrder) {
  uni.navigateTo({
    url: `/pages/order-detail/index?id=${order.id}&type=${activeTab.value}`,
  });
}

/** 获取服务项展示名 */
function getServiceLabel(order: AnyOrder): string {
  if (activeTab.value === 'cleaning') {
    return (order as CleaningOrderDto).serviceItem || '保洁服务';
  }
  if (activeTab.value === 'recycling') {
    return (order as RecyclingOrderDto).serviceItem || '废品回收';
  }
  return (order as ConsultOrderDto).serviceType || '家政咨询';
}

/** 获取预约时间信息 */
function getAppointInfo(order: AnyOrder): string {
  if (activeTab.value === 'consult') return '';
  const o = order as CleaningOrderDto | RecyclingOrderDto;
  if (!o.appointDate) return '';
  const date = o.appointDate.substring(0, 10);
  const slot = o.appointTimeSlot || '';
  return slot ? `${date} ${slot}` : date;
}

/** 获取地址文本 */
function getAddressText(order: AnyOrder): string {
  if (activeTab.value === 'consult') return '';
  const snapshot = (order as CleaningOrderDto).addressSnapshot as Record<string, unknown> | null | undefined;
  if (!snapshot) return '';
  const detail = (snapshot.detail as string) || (snapshot.address as string) || '';
  return detail.length > 20 ? detail.substring(0, 20) + '…' : detail;
}

/** 状态对应的展示名（居民端）*/
function getStatusLabel(status: string, tab: TabKey): string {
  if (tab === 'consult') {
    const map: Record<string, string> = {
      FOLLOW_UP: '待跟进',
      FOLLOWING: '跟进中',
      COMPLETED: '已完成',
    };
    return map[status] || status;
  }
  const map: Record<string, string> = {
    PENDING_ASSIGN: '待服务',
    ASSIGNED: '待服务',
    ACCEPTED: '待服务',
    IN_SERVICE: '进行中',
    PENDING_REVIEW: '待反馈',
    REVIEWED: '已评价',
    CANCELLED: '已取消',
  };
  return map[status] || status;
}

/** 状态徽标颜色 class */
function getStatusClass(status: string): string {
  const blue = ['PENDING_ASSIGN', 'ASSIGNED', 'ACCEPTED', 'FOLLOW_UP'];
  const orange = ['IN_SERVICE', 'PENDING_REVIEW', 'FOLLOWING'];
  const green = ['REVIEWED', 'COMPLETED'];
  const grey = ['CANCELLED'];
  if (blue.includes(status)) return 'badge-blue';
  if (orange.includes(status)) return 'badge-orange';
  if (green.includes(status)) return 'badge-green';
  if (grey.includes(status)) return 'badge-grey';
  return 'badge-blue';
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

/* 顶部 Tab */
.top-tabs {
  display: flex;
  flex-direction: row;
  background: #ffffff;
  padding: 0 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.top-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 0 0;
  position: relative;
}

.top-tab-text {
  font-size: 30rpx;
  color: #666;
  padding-bottom: 20rpx;
}

.tab-active .top-tab-text {
  color: #1677ff;
  font-weight: 600;
}

.tab-underline {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  border-radius: 2rpx;
  background: #1677ff;
}

/* 状态筛选胶囊
   微信小程序 scroll-view 不支持 flex 溢出，
   必须用 white-space:nowrap + display:inline-flex 内联方案 */
.filter-scroll {
  background: #ffffff;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-row {
  white-space: nowrap;
  padding: 0 24rpx;
  font-size: 0;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 28rpx;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  background: #fafafa;
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
  margin-right: 16rpx;
  vertical-align: middle;
}

.filter-pill:last-child {
  margin-right: 48rpx;
}

.pill-active {
  background: #e6f0ff;
  border-color: #1677ff;
  color: #1677ff;
}

/* 列表区 */
.order-list {
  flex: 1;
  overflow: hidden;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 订单卡片 */
.card-list {
  padding: 24rpx 32rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 24rpx;
  margin-bottom: 20rpx;
  position: relative;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.card-service {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
  flex: 1;
  margin-right: 16rpx;
}

.status-badge {
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.badge-text {
  font-size: 24rpx;
  font-weight: 500;
}

.badge-blue {
  background: #e6f0ff;
}
.badge-blue .badge-text {
  color: #1677ff;
}

.badge-orange {
  background: #fff3e0;
}
.badge-orange .badge-text {
  color: #fa8c16;
}

.badge-green {
  background: #f0fff0;
}
.badge-green .badge-text {
  color: #52c41a;
}

.badge-grey {
  background: #f5f5f5;
}
.badge-grey .badge-text {
  color: #999;
}

.card-order-no {
  font-size: 24rpx;
  color: #bbb;
  margin-bottom: 12rpx;
  display: block;
}

.card-info-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 8rpx;
}

.info-icon {
  font-size: 24rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}

.desc-truncate {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.proxy-tag {
  display: inline-flex;
  align-items: center;
  margin-top: 12rpx;
  background: #fff7e0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.proxy-tag text {
  font-size: 22rpx;
  color: #fa8c16;
}

.card-arrow {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
}

.arrow-icon {
  font-size: 40rpx;
  color: #ccc;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
  font-size: 26rpx;
  color: #bbb;
}

.no-more-text {
  color: #ddd;
}
</style>
