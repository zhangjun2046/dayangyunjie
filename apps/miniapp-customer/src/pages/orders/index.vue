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
        <image class="empty-icon" src="/static/icons/add-photo.png" mode="aspectFit" />
        <text class="empty-text">请先登录后查看订单</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && orders.length === 0" class="empty-wrap">
        <image class="empty-icon" src="/static/icons/add-photo.png" mode="aspectFit" />
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
				
				<image class="order-icon" :src="getOrderIcon(order)"></image>
          <!-- 卡片头：服务项 + 状态徽标 -->
				<view class="card-info">
					<view class="card-header">
					  <text class="card-service">{{ getServiceLabel(order) }}</text>
					  <view class="status-badge" :class="getOrderBadgeClass(order.status)">
					    <text class="badge-text">{{ getOrderBadgeLabel(order.status, activeTab) }}</text>
					  </view>
					</view>
					
					<!-- 订单号 -->
					<!-- <text class="card-order-no">{{ order.orderNo }}</text> -->
					
					<!-- 时间 -->
					<view class="card-info-row" v-if="getAppointInfo(order)">
						<image class="info-icon" src="/src/static/icons/icon_shijian_n.png" mode="aspectFit"></image>
					  <text class="info-text">{{ getAppointInfo(order) }}</text>
					</view>
					
					<!-- 地址（保洁/废品有） -->
					<view class="card-info-row" v-if="getAddressText(order)">
						<image class="info-icon" src="/src/static/icons/icon_weizhi_n.png" mode="aspectFit"></image>
					  <text class="info-text">{{ getAddressText(order) }}</text>
					</view>
					
					<!-- 家政咨询：需求描述摘要 -->
					<!-- <view class="card-info-row" v-if="activeTab === 'consult' && (order as ConsultOrderDto).requirementDesc">
					  <image class="info-icon" src="/src/static/icons/icon_shijian_n.png" mode="aspectFit"></image>
					  <text class="info-text">{{ getAppointInfo(order) }}</text>
					</view> -->
					
					<!-- 代下单标记 -->
					<!-- <view v-if="order.isProxyOrder" class="proxy-tag">
					  <text>代下单</text>
					</view> -->
					
					<!-- 箭头 -->
					<!-- <view class="card-arrow">
					  <text class="arrow-icon"></text>
					</view> -->
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
import {
  FILTERS_CONSULT,
  FILTERS_MAIN,
  getOrderBadgeClass,
  getOrderBadgeLabel,
} from '@/constants/order-status';

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

const authStore = useAuthStore();
const activeTab = ref<TabKey>('cleaning');
const activeFilter = ref<string>('all');
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
  activeFilter.value = 'all';
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
    const selectedFilter = currentFilters.value.find((filter) => filter.key === filterKey);
    const statuses = selectedFilter?.statuses ?? [];

    console.info(`[orders] loadData tab=${activeTab.value} filter="${filterKey}" residentId=${residentId} page=${page}`);

    let result: { items: AnyOrder[]; total: number };

    if (activeTab.value === 'cleaning') {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (statuses.length > 1) {
        params.statuses = statuses.join(',');
      } else if (statuses.length === 1) {
        params.status = statuses[0];
      }
      result = await fetchCleaningOrderList(params as Parameters<typeof fetchCleaningOrderList>[0]);
    } else if (activeTab.value === 'recycling') {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (statuses.length > 1) {
        params.statuses = statuses.join(',');
      } else if (statuses.length === 1) {
        params.status = statuses[0];
      }
      result = await fetchRecyclingOrderList(params as Parameters<typeof fetchRecyclingOrderList>[0]);
    } else {
      const params: Record<string, unknown> = { residentId, page, pageSize: PAGE_SIZE };
      if (statuses.length === 1) {
        params.status = statuses[0];
      }
      result = await fetchConsultOrderList(params as Parameters<typeof fetchConsultOrderList>[0]);
    }

    const newItems = result.items as AnyOrder[];
    if (isMore) {
      orders.value = [...orders.value, ...newItems];
    } else {
      orders.value = newItems;
    }

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
  if (activeTab.value === 'consult') {
		const o = order as ConsultOrderDto;
		if (!o.createdAt) return '';
		const date = o.createdAt.substring(0, 10);
		return date;
		
	}
  const o = order as CleaningOrderDto | RecyclingOrderDto;
  if (!o.appointDate) return '';
  const date = o.appointDate.substring(0, 10);
  const slot = o.appointTimeSlot || '';
  return slot ? `${date} ${slot}` : date;
}

/** 获取地址文本：省市区 + 详细地址 + 楼栋信息（与员工端任务列表一致） */
function getAddressText(order: AnyOrder): string {
  if (activeTab.value === 'consult') return '';
  const snapshot = (order as CleaningOrderDto).addressSnapshot as Record<string, unknown> | null | undefined;
  if (!snapshot) return '';
  return [snapshot.province, snapshot.city, snapshot.district, snapshot.detail, snapshot.buildingInfo]
    .filter(Boolean)
    .join('');
}

function getOrderIcon(order: AnyOrder): string {
	if (activeTab.value === 'cleaning') {
	  const serviceItem = (order as CleaningOrderDto).serviceItem;
		if (serviceItem?.includes('日常')) return '/static/icons/daily-cleaning.png';
		if (serviceItem?.includes('深度')) return '/static/icons/deep-cleaning.png';
		if (serviceItem?.includes('专项')) return '/static/icons/special-cleaning.png';
	}
	if (activeTab.value === 'recycling') {
	  const serviceItem = (order as RecyclingOrderDto).serviceItem;
		if (serviceItem?.includes('大件')) return '/static/icons/icon_dajian_n.png';
		if (serviceItem?.includes('小件')) return '/static/icons/icon_xiaojian_n.png';
	}
	const serviceItem = (order as ConsultOrderDto).serviceType;
	if (serviceItem?.includes('保姆')) return '/static/icons/icon_baomu_n.png';	
	if (serviceItem?.includes('月嫂')) return '/static/icons/icon_yuesao_n.png';	
	if (serviceItem?.includes('育儿嫂')) return '/static/icons/icon_yuersao_n.png';	
	if (serviceItem?.includes('陪诊')) return '/static/icons/icon_peizhen_n.png';	
	if (serviceItem?.includes('代买菜')) return '/static/icons/icon_daimaicai_n.png';	
	return ''
}


</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F8FAFF;
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
  font-size: 36rpx;
  color: #666;
  padding-bottom: 20rpx;
}

.tab-active .top-tab-text {
  color: #333333;
  font-weight: 600;
}

.tab-underline {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  border-radius: 2rpx;
  background: #236EFF;
}

/* 状态筛选胶囊
   微信小程序 scroll-view 不支持 flex 溢出，
   必须用 white-space:nowrap + display:inline-flex 内联方案 */
.filter-scroll {
  padding: 18rpx 0;
}

.filter-row {
  white-space: nowrap;
  padding: 0 24rpx;
  font-size: 0;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 28rpx;
  border-radius: 40rpx;
  background: #fff;
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
  margin-right: 16rpx;
  vertical-align: middle;
}

.filter-pill:last-child {
  margin-right: 48rpx;
}

.pill-active {
  background: #236EFF;
  color: #fff;
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
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 订单卡片 */
.card-list {
  padding: 4rpx 26rpx 14rpx 26rpx;
}

.order-card {
	display: flex;
	align-items: center;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 38rpx 28rpx;
  margin-bottom: 20rpx;
  position: relative;
	box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0,0,0,0.05);	
}

.order-icon {
	width: 100rpx;
	height: 100rpx;
	margin-right: 30rpx;
}

.card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.card-service {
  font-size: 36rpx;
  font-weight: bold;
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
  font-size: 26rpx;
}

.badge-blue {
  background: #e6f0ff;
}
.badge-blue .badge-text {
  color: #236EFF;
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
  font-size: 26rpx;
  color: #bbb;
	margin-top: 5rpx;
  margin-bottom: 16rpx;
  display: block;
}

.card-info {
	flex: 1;
}

.card-info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 8rpx;
}

.info-icon {
	width: 32rpx;
	height: 32rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-text {
  font-size: 30rpx;
  color: #58636A;
  line-height: 1.6;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
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
