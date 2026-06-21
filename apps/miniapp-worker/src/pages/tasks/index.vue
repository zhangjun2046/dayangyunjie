<template>
  <view class="page">
    <!-- 顶部双 Tab：保洁服务 / 废品回收 -->
    <view class="top-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', activeTab === tab.value && 'tab-item--active']"
        @tap="onTabChange(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="tab-indicator" />
      </view>
    </view>

    <!-- 状态筛选胶囊（scroll-view 横向，mp-weixin 兼容方案） -->
    <scroll-view class="filter-scroll" scroll-x>
      <view class="filter-row">
        <view
          v-for="pill in statusPills"
          :key="pill.key"
          :class="['filter-pill', activePillKey === pill.key && 'filter-pill--active']"
          @tap="onPillChange(pill.key)"
        >
          <text class="filter-pill-text">{{ pill.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载中占位 -->
    <view v-if="loading && orders.length === 0" class="status-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">加载中…</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading && orders.length === 0" class="status-wrap empty-wrap">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无相关任务</text>
      <text class="empty-sub">下拉刷新可更新列表</text>
    </view>

    <!-- 任务卡片列表 -->
    <view v-else class="order-list">
      <view
        v-for="item in orders"
        :key="item.orderNo"
        class="order-card"
      >
        <!-- 状态徽标 -->
        <view :class="['status-badge', `status-badge--${item.status.toLowerCase()}`]">
          <text class="status-badge-text">{{ statusLabel(item.status) }}</text>
        </view>

        <!-- 卡片主信息区 -->
        <view class="card-main">
          <!-- 服务类型图标 -->
          <view :class="['service-icon', item.orderType === 'cleaning' ? 'icon-cleaning' : 'icon-recycling']">
            <text class="icon-char">{{ item.orderType === 'cleaning' ? '🧹' : '♻️' }}</text>
          </view>
          <!-- 文字信息 -->
          <view class="card-info">
            <text class="service-name">{{ item.serviceName }}</text>
            <view class="time-row">
              <text class="meta-icon">⏰</text>
              <text class="time-text">{{ item.appointDate }}&nbsp;&nbsp;{{ item.appointTimeSlot }}</text>
            </view>
            <view class="addr-row">
              <text class="meta-icon">📍</text>
              <text class="addr-text">{{ item.address || '地址加载中…' }}</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮区：ASSIGNED 显示接单按钮，所有状态均显示查看详情 -->
        <view class="card-actions">
          <button class="btn btn-outline" @tap="handleViewDetail(item)">查看详情</button>
          <button
            v-if="item.status === 'ASSIGNED'"
            class="btn btn-primary"
            :disabled="acceptingOrderNo === item.orderNo"
            @tap="handleAccept(item)"
          >
            {{ acceptingOrderNo === item.orderNo ? '接单中…' : '立即接单' }}
          </button>
        </view>
      </view>

      <!-- 底部加载更多提示 -->
      <view v-if="orders.length > 0" class="load-more-tip">
        <text v-if="loadingMore" class="load-more-text">加载中…</text>
        <text v-else-if="noMore" class="load-more-text">已加载全部</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { fetchWorkerOrders, acceptOrder } from '@/api/order';
import type { WorkerOrderItem } from '@/api/order';

const authStore = useAuthStore();

/** 双 Tab 定义 */
const tabs = [
  { label: '保洁服务', value: 'cleaning' as const },
  { label: '废品回收', value: 'recycling' as const },
] as const;

type TabValue = 'cleaning' | 'recycling';

/** 状态筛选胶囊定义（无 PENDING_ASSIGN） */
const statusPills = [
  { key: 'all', label: '全部', statuses: [] as string[] },
  { key: 'ASSIGNED', label: '已派单', statuses: ['ASSIGNED'] },
  { key: 'ACCEPTED', label: '已接单', statuses: ['ACCEPTED'] },
  { key: 'IN_SERVICE', label: '服务中', statuses: ['IN_SERVICE'] },
  { key: 'PENDING_REVIEW', label: '待评价', statuses: ['PENDING_REVIEW'] },
  { key: 'REVIEWED', label: '已评价', statuses: ['REVIEWED'] },
  { key: 'CANCELLED', label: '已取消', statuses: ['CANCELLED'] },
];

const activeTab = ref<TabValue>('cleaning');
const activePillKey = ref('all');
const orders = ref<WorkerOrderItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const currentPage = ref(1);
const totalCount = ref(0);
const PAGE_SIZE = 20;
const acceptingOrderNo = ref<string | null>(null);

const noMore = computed(() => orders.value.length >= totalCount.value && orders.value.length > 0);

/** 当前激活胶囊对应的 statuses */
function getActiveStatuses(): string[] {
  const pill = statusPills.find((p) => p.key === activePillKey.value);
  return pill?.statuses ?? [];
}

/** 状态值映射为显示文字 */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: '已派单',
    ACCEPTED: '已接单',
    IN_SERVICE: '服务中',
    PENDING_REVIEW: '待评价',
    REVIEWED: '已评价',
    CANCELLED: '已取消',
  };
  return map[status] ?? status;
}

/**
 * 加载任务列表
 * @param page      目标页码
 * @param replace   true=替换列表（刷新），false=追加（加载更多）
 */
async function loadOrders(page: number, replace: boolean): Promise<void> {
  const workerId = authStore.worker?.id;
  if (!workerId) {
    console.info('[tasks] loadOrders skipped: no workerId');
    return;
  }

  if (replace) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const { items, total } = await fetchWorkerOrders(
      workerId,
      activeTab.value,
      getActiveStatuses(),
      page,
      PAGE_SIZE,
    );
    totalCount.value = total;
    currentPage.value = page;
    if (replace) {
      orders.value = items;
    } else {
      orders.value = [...orders.value, ...items];
    }
    console.info('[tasks] loadOrders done, tab=', activeTab.value, 'page=', page, 'total=', total);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[tasks] loadOrders failed, err=', msg);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

/** 切换 Tab：重置胶囊和列表 */
function onTabChange(tab: TabValue): void {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  activePillKey.value = 'all';
  loadOrders(1, true);
}

/** 切换状态胶囊：重置列表 */
function onPillChange(key: string): void {
  if (activePillKey.value === key) return;
  activePillKey.value = key;
  loadOrders(1, true);
}

/** 每次页面显示时刷新 */
onShow(() => {
  loadOrders(1, true);
});

/** 下拉刷新 */
onPullDownRefresh(async () => {
  await loadOrders(1, true);
  uni.stopPullDownRefresh();
});

/** 上拉加载更多 */
onReachBottom(() => {
  if (loadingMore.value || noMore.value) return;
  loadOrders(currentPage.value + 1, false);
});

/** 立即接单 */
async function handleAccept(item: WorkerOrderItem): Promise<void> {
  if (acceptingOrderNo.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) return;

  acceptingOrderNo.value = item.orderNo;
  try {
    await acceptOrder(item.orderType, item.id, workerId);
    uni.showToast({ title: '接单成功', icon: 'success' });
    console.info('[tasks] acceptOrder success, orderNo=', item.orderNo);
    await loadOrders(1, true);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接单失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[tasks] acceptOrder failed, err=', msg);
  } finally {
    acceptingOrderNo.value = null;
  }
}

/** 查看详情：跳转到任务详情页 */
function handleViewDetail(item: WorkerOrderItem): void {
  console.info('[tasks] handleViewDetail, orderNo=', item.orderNo, 'type=', item.orderType);
  uni.navigateTo({
    url: `/pages/task-detail/index?orderId=${item.id}&orderType=${item.orderType}`,
  });
}
</script>

<style scoped>
/* ===== 整体布局 ===== */
.page {
  min-height: 100vh;
  background: #f0f4f8;
}

/* ===== 顶部双 Tab ===== */
.top-tabs {
  display: flex;
  background: #ffffff;
  border-bottom: 1rpx solid #e8ecf0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 0;
  position: relative;
}

.tab-label {
  font-size: 30rpx;
  color: #999;
  padding-bottom: 20rpx;
  font-weight: 400;
}

.tab-item--active .tab-label {
  color: #1677ff;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  background: #1677ff;
  border-radius: 3rpx;
}

/* ===== 状态筛选胶囊 ===== */
.filter-scroll {
  background: #ffffff;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e8ecf0;
  white-space: nowrap;
}

.filter-row {
  white-space: nowrap;
  padding: 0 24rpx;
  font-size: 0;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  height: 56rpx;
  padding: 0 24rpx;
  margin-right: 16rpx;
  background: #f0f4f8;
  border-radius: 28rpx;
  border: 2rpx solid transparent;
}

.filter-pill--active {
  background: #e8f0fe;
  border-color: #1677ff;
}

.filter-pill-text {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

.filter-pill--active .filter-pill-text {
  color: #1677ff;
  font-weight: 600;
}

/* ===== 状态/空状态 ===== */
.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid #e8ecf0;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.empty-wrap {
  gap: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #666;
  font-weight: 500;
}

.empty-sub {
  font-size: 24rpx;
  color: #bbb;
}

/* ===== 卡片列表 ===== */
.order-list {
  padding: 24rpx 24rpx 40rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

/* ===== 状态徽标 ===== */
.status-badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  font-size: 0;
}

.status-badge-text {
  font-size: 22rpx;
  font-weight: 500;
}

/* ASSIGNED 已派单：橙色 */
.status-badge--assigned {
  background: #fff3e0;
}
.status-badge--assigned .status-badge-text {
  color: #e65100;
}

/* ACCEPTED 已接单：蓝色 */
.status-badge--accepted {
  background: #e3f2fd;
}
.status-badge--accepted .status-badge-text {
  color: #1565c0;
}

/* IN_SERVICE 服务中：紫色 */
.status-badge--in_service {
  background: #f3e5f5;
}
.status-badge--in_service .status-badge-text {
  color: #6a1b9a;
}

/* PENDING_REVIEW 待评价：浅蓝 */
.status-badge--pending_review {
  background: #e8f4fd;
}
.status-badge--pending_review .status-badge-text {
  color: #0277bd;
}

/* REVIEWED 已评价：绿色 */
.status-badge--reviewed {
  background: #e8f5e9;
}
.status-badge--reviewed .status-badge-text {
  color: #2e7d32;
}

/* CANCELLED 已取消：灰色 */
.status-badge--cancelled {
  background: #f5f5f5;
}
.status-badge--cancelled .status-badge-text {
  color: #9e9e9e;
}

/* ===== 卡片主信息 ===== */
.card-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding-right: 140rpx;
}

.service-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-cleaning {
  background: #e8f5e9;
}

.icon-recycling {
  background: #fff8e1;
}

.icon-char {
  font-size: 40rpx;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.service-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
  margin-bottom: 14rpx;
}

.time-row,
.addr-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.meta-icon {
  font-size: 24rpx;
  flex-shrink: 0;
}

.time-text,
.addr-text {
  font-size: 24rpx;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 操作按钮 ===== */
.card-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}

.btn {
  flex: 1;
  height: 76rpx;
  border-radius: 38rpx;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin: 0;
  padding: 0;
  line-height: 1;
}

.btn::after {
  display: none;
}

.btn-outline {
  background: #ffffff;
  color: #1677ff;
  border: 2rpx solid #1677ff;
}

.btn-primary {
  background: #1677ff;
  color: #ffffff;
}

.btn-primary[disabled] {
  background: #b0c8ff;
  color: #ffffff;
}

/* ===== 加载更多 ===== */
.load-more-tip {
  display: flex;
  justify-content: center;
  padding: 20rpx 0;
}

.load-more-text {
  font-size: 24rpx;
  color: #bbb;
}
</style>
