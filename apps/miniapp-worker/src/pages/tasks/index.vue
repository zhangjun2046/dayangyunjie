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
      <image class="empty-icon-img" src="/static/icons/task.png" mode="aspectFit" />
      <text class="empty-text">暂无相关任务</text>
      <text class="empty-sub">下拉刷新可更新列表</text>
    </view>

    <!-- 任务卡片列表 -->
    <view v-else class="order-list">
      <view
        v-for="item in orders"
        :key="item.orderNo"
        class="order-card"
				@click="handleViewDetail(item)"
      >
        <!-- 状态徽标 -->
        <view :class="['status-badge', `status-badge--${item.status.toLowerCase()}`]">
          <text class="status-badge-text">{{ statusLabel(item.status) }}</text>
        </view>

        <!-- 卡片主信息区 -->
        <view class="card-main">
          <!-- 服务类型图标 -->
          <view :class="['service-icon', item.orderType === 'cleaning' ? 'icon-cleaning' : 'icon-recycling']">
            <text v-if="getServiceEmoji(item)" class="icon-emoji">
              {{ getServiceEmoji(item) }}
            </text>
            <image
              v-else
              class="icon-img"
              :src="getServiceIcon(item)"
              mode="aspectFit"
              @error="onServiceIconError(item)"
            />
          </view>
          <!-- 文字信息 -->
          <view class="card-info">
            <text class="service-name">{{ item.serviceName }}</text>
            <view class="time-row">
              <image class="meta-icon" src="/static/icons/icon_shijian_n.png" mode="aspectFit" />
              <text class="time-text">{{ item.appointDate }}&nbsp;&nbsp;{{ item.appointTimeSlot }}</text>
            </view>
            <view class="addr-row">
              <image class="meta-icon" src="/static/icons/icon_weizhi_n.png" mode="aspectFit" />
              <text class="addr-text">{{ item.address || '地址加载中…' }}</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮区：ASSIGNED 显示接单按钮，所有状态均显示查看详情 -->
        <view class="card-actions" v-if="item.status === 'ASSIGNED'">
          <button class="btn btn-outline" @click.stop="handleViewDetail(item)">查看详情</button>
          <button
            class="btn btn-primary"
            :disabled="acceptingOrderNo === item.orderNo"
            @click.stop="handleAccept(item)"
          >
            {{ acceptingOrderNo === item.orderNo ? '接单中…' : '立即接单' }}
          </button>
        </view>
				<!-- <view v-else class="card-actions">
				  <button class="btn btn-outline" @tap="handleViewDetail(item)">查看详情</button>
				  <button
				    class="btn btn-primary"
				    :disabled="acceptingOrderNo === item.orderNo"
				    @tap="handleAccept(item)"
				  >
				    {{ acceptingOrderNo === item.orderNo ? '接单中…' : '立即接单' }}
				  </button>
				</view> -->
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
import { fetchWorkerServiceCatalogs } from '@/api/service-catalog';
import type { ServiceCatalogDto } from '@/api/service-catalog';
import {
  resolveOrderRemoteIcon,
  resolveOrderServiceEmoji,
  resolveOrderServiceIcon,
} from '@/utils/service-catalog-icon';

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
const serviceCatalogs = ref<ServiceCatalogDto[]>([]);
const failedRemoteIcons = ref<Set<string>>(new Set());
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

/** 加载二级服务配置；失败时保留一级大类图标，不阻断任务列表。 */
async function loadServiceCatalogs(): Promise<void> {
  try {
    serviceCatalogs.value = await fetchWorkerServiceCatalogs();
    failedRemoteIcons.value = new Set();
  } catch (err) {
    console.info('[tasks] loadServiceCatalogs failed, use default icons', err);
  }
}

/** 获取订单对应的二级服务配置图标。 */
function getServiceIcon(item: WorkerOrderItem): string {
  return resolveOrderServiceIcon(item, serviceCatalogs.value, failedRemoteIcons.value);
}

/** 获取订单对应的 Emoji 图标；图片地址返回 null。 */
function getServiceEmoji(item: WorkerOrderItem): string | null {
  return resolveOrderServiceEmoji(item, serviceCatalogs.value);
}

/** 远程配置图标加载失败后，记录地址并切换为一级大类兜底图标。 */
function onServiceIconError(item: WorkerOrderItem): void {
  const remoteIcon = resolveOrderRemoteIcon(item, serviceCatalogs.value);
  if (!remoteIcon || failedRemoteIcons.value.has(remoteIcon)) return;
  failedRemoteIcons.value = new Set([...failedRemoteIcons.value, remoteIcon]);
  console.info('[tasks] service icon load failed, fallback=', remoteIcon);
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
  Promise.all([loadOrders(1, true), loadServiceCatalogs()]);
});

/** 下拉刷新 */
onPullDownRefresh(async () => {
  await Promise.all([loadOrders(1, true), loadServiceCatalogs()]);
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
/* ===== 整体布局（对齐居民端订单页） ===== */
.page {
  min-height: 100vh;
  background: #F8FAFF;
}

/* ===== 顶部双 Tab ===== */
.top-tabs {
  display: flex;
  flex-direction: row;
  background: #ffffff;
  padding: 0 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 0 0;
  position: relative;
}

.tab-label {
  font-size: 36rpx;
  color: #666;
  padding-bottom: 20rpx;
  font-weight: 400;
}

.tab-item--active .tab-label {
  color: #333333;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  width: auto;
  height: 4rpx;
  background: #236EFF;
  border-radius: 2rpx;
  transform: none;
}

/* ===== 状态筛选胶囊 ===== */
.filter-scroll {
  padding: 18rpx 0;
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
  padding: 14rpx 28rpx;
  margin-right: 16rpx;
  background: #fff;
  border-radius: 40rpx;
  border: none;
  vertical-align: middle;
}

.filter-pill:last-child {
  margin-right: 48rpx;
}

.filter-pill--active {
  background: #236EFF;
}

.filter-pill-text {
  font-size: 28rpx;
  color: #666;
  white-space: nowrap;
}

.filter-pill--active .filter-pill-text {
  color: #fff;
  font-weight: 400;
}

/* ===== 状态/空状态 ===== */
.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid #e8ecf0;
  border-top-color: #236EFF;
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

.empty-icon-img {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 8rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 400;
}

.empty-sub {
  font-size: 24rpx;
  color: #bbb;
}

/* ===== 卡片列表 ===== */
.order-list {
  padding: 4rpx 26rpx 14rpx 26rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 38rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0, 0, 0, 0.05);
  position: relative;
}

/* ===== 状态徽标 ===== */
.status-badge {
  position: absolute;
  top: 38rpx;
  right: 28rpx;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  font-size: 0;
  flex-shrink: 0;
}

.status-badge-text {
  font-size: 26rpx;
}

/* ASSIGNED 已派单：蓝 */
.status-badge--assigned {
  background: #e6f0ff;
}
.status-badge--assigned .status-badge-text {
  color: #236EFF;
}

/* ACCEPTED 已接单：蓝 */
.status-badge--accepted {
  background: #e6f0ff;
}
.status-badge--accepted .status-badge-text {
  color: #236EFF;
}

/* IN_SERVICE 服务中：橙 */
.status-badge--in_service {
  background: #fff3e0;
}
.status-badge--in_service .status-badge-text {
  color: #fa8c16;
}

/* PENDING_REVIEW 待评价：橙 */
.status-badge--pending_review {
  background: #fff3e0;
}
.status-badge--pending_review .status-badge-text {
  color: #fa8c16;
}

/* REVIEWED 已评价：绿 */
.status-badge--reviewed {
  background: #f0fff0;
}
.status-badge--reviewed .status-badge-text {
  color: #52c41a;
}

/* CANCELLED 已取消：灰 */
.status-badge--cancelled {
  background: #f5f5f5;
}
.status-badge--cancelled .status-badge-text {
  color: #999;
}

/* ===== 卡片主信息 ===== */
.card-main {
  display: flex;
  align-items: center;
  gap: 0;
  padding-right: 120rpx;
}

.service-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 30rpx;
}

.icon-cleaning,
.icon-recycling {
  background: transparent;
}

.icon-img {
  width: 100rpx;
  height: 100rpx;
}

.icon-emoji {
  font-size: 56rpx;
  line-height: 1;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.service-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 12rpx;
}

.time-row,
.addr-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  margin-bottom: 8rpx;
}

.meta-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
}

.time-text,
.addr-text {
  font-size: 26rpx;
  color: #636D73;
  line-height: 1.6;
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
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  text-align: center;
  margin: 0;
  padding: 0;
}

.btn::after {
  display: none;
}

.btn-outline {
  background: #ffffff;
  color: #236EFF;
  border: 1rpx solid #236EFF;
}

.btn-primary {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
  color: #ffffff;
}

.btn-primary[disabled] {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
  opacity: 0.5;
  color: #ffffff;
}

/* ===== 加载更多 ===== */
.load-more-tip {
  display: flex;
  justify-content: center;
  padding: 24rpx 0 40rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #bbb;
}
</style>
