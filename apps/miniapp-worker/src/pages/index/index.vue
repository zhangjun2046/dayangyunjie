<template>
  <view class="page">
    <!-- 顶部沉浸式头图（icon_bj_n + 底部圆角）+ 统计双卡 -->
    <view class="home-header">
      <view class="header-hero">
        <image
          class="header-bg-img"
          src="/static/images/icon_bj_n.png"
          mode="aspectFill"
        />
        <view class="status-bar-spacer" :style="{ height: `${statusBarHeight}px` }" />
        <!-- 标题：导航栏底部偏左 -->
        <view class="header-title-row">
          <text class="header-title">大洋云洁·智享社区</text>
        </view>
      </view>
      <view class="stats-row">
        <view class="stat-card">
          <view class="stat-text">
            <text class="stat-label">待办</text>
            <text class="stat-value">{{ pendingCount }}</text>
          </view>
          <!-- 待补充：今日订单图标 → /static/icons/icon_today_order_n.png -->
          <image
            class="stat-icon"
            src="/static/icons/icon_today_order_n.png"
            mode="aspectFit"
          />
        </view>
        <view class="stat-card">
          <view class="stat-text">
            <text class="stat-label">今日已完成</text>
            <text class="stat-value">{{ todayDone }}</text>
          </view>
          <!-- 待补充：已完成图标 → /static/icons/icon_today_done_n.png -->
          <image
            class="stat-icon"
            src="/static/icons/icon_today_done_n.png"
            mode="aspectFit"
          />
        </view>
      </view>
    </view>

    <view class="page-body">
      <!-- 待接单分区标题 -->
      <view class="section-header">
        <view class="section-indicator" />
        <text class="section-title">待接单</text>
      </view>

      <!-- 加载中占位 -->
      <view v-if="loading" class="status-wrap">
        <view class="loading-spinner" />
        <text class="loading-text">加载中…</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="orders.length === 0" class="status-wrap empty-wrap">
        <image class="empty-icon-img" src="/static/icons/task.png" mode="aspectFit" />
        <text class="empty-text">暂无待接单任务</text>
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
          <view class="card-main">
            <view :class="['service-icon', item.orderType === 'cleaning' ? 'icon-cleaning' : 'icon-recycling']">
              <image
                class="icon-img"
                :src="item.orderType === 'cleaning' ? '/static/icons/cleaning.png' : '/static/icons/recycling.png'"
                mode="aspectFit"
              />
            </view>
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

          <view class="card-actions">
            <button class="btn btn-outline">查看详情</button>
            <button
              class="btn btn-primary"
              :disabled="acceptingOrderNo === item.orderNo"
              @click.stop="handleAccept(item)"
            >
              {{ acceptingOrderNo === item.orderNo ? '接单中…' : '立即接单' }}
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { ensureAuthed } from '@/composables/useRouteGuard';
import { fetchAssignedOrders, acceptOrder } from '@/api/order';
import type { AssignedOrderItem } from '@/api/order';
import { fetchWorkerDetail } from '@/api/worker';

const authStore = useAuthStore();
const orders = ref<AssignedOrderItem[]>([]);
const loading = ref(false);
const acceptingOrderNo = ref<string | null>(null);

function readStatusBarHeight(): number {
  try {
    const info =
      typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync();
    return Number(info?.statusBarHeight) || 20;
  } catch {
    return 20;
  }
}
const statusBarHeight = ref(readStatusBarHeight());

/** 已接单且尚未完成的待办数 */
const pendingCount = ref(0);
/** 今日已完成数（按完成服务日志时间） */
const todayDone = ref(0);

/** 加载待办 / 今日已完成统计 */
async function loadTodayStats(): Promise<void> {
  const workerId = authStore.worker?.id;
  if (!workerId) return;
  try {
    const detail = await fetchWorkerDetail(workerId);
    pendingCount.value = detail.pendingOrders ?? 0;
    todayDone.value = detail.todayOrders ?? 0;
    console.info('[home] stats, pending=', pendingCount.value, 'todayDone=', todayDone.value);
  } catch (err) {
    console.info('[home] loadTodayStats error', err);
  }
}

async function loadOrders(): Promise<void> {
  const workerId = authStore.worker?.id;
  if (!workerId) {
    console.info('[home] loadOrders skipped: no workerId');
    return;
  }
  loading.value = true;
  try {
    orders.value = await fetchAssignedOrders(workerId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function refreshPage(): Promise<void> {
  await Promise.all([loadOrders(), loadTodayStats()]);
}

onShow(async () => {
  const ok = await ensureAuthed();
  if (!ok) return;
  refreshPage();
});

onPullDownRefresh(async () => {
  await refreshPage();
  uni.stopPullDownRefresh();
});

async function handleAccept(item: AssignedOrderItem): Promise<void> {
  if (acceptingOrderNo.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) return;

  acceptingOrderNo.value = item.orderNo;
  try {
    await acceptOrder(item.orderType, item.id, workerId);
    orders.value = orders.value.filter((o) => o.orderNo !== item.orderNo);
    uni.showToast({ title: '接单成功', icon: 'success' });
    console.info('[home] acceptOrder success, orderNo=', item.orderNo);
    loadTodayStats();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接单失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[home] acceptOrder failed, orderNo=', item.orderNo, 'err=', msg);
  } finally {
    acceptingOrderNo.value = null;
  }
}

function handleViewDetail(item: AssignedOrderItem): void {
  console.info('[home] handleViewDetail, orderNo=', item.orderNo, 'type=', item.orderType);
  uni.navigateTo({
    url: `/pages/task-detail/index?orderId=${item.id}&orderType=${item.orderType}`,
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #F8FAFF;
  box-sizing: border-box;
}

/* ===== 顶部沉浸式头图 + 统计卡 ===== */
.home-header {
  position: relative;
  margin-bottom: 8rpx;
}

.header-hero {
  position: relative;
  overflow: hidden;
  border-radius: 0 0 48rpx 48rpx;
  /* 头图加高 */
  min-height: 320rpx;
}

.header-bg-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  border-radius: 0 0 32rpx 32rpx;
}

.status-bar-spacer {
  position: relative;
  z-index: 1;
  width: 100%;
}

/* 标题贴在导航栏底部偏左 */
.header-title-row {
  position: relative;
  z-index: 1;
  padding: 0 32rpx 72rpx;
  margin-top: -28rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}

.stats-row {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  margin-top: -76rpx;
  padding: 0 24rpx;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
	background: linear-gradient( 180deg, #EDF5FF 0%, #FFFFFF 100%);
  border-radius: 38rpx;
  padding: 38rpx 46rpx 38rpx 30rpx;
	box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0,0,0,0.05);
  min-height: 140rpx;
  box-sizing: border-box;
}

.stat-text {
  display: flex;
  flex-direction: column;
	align-items: center;
  gap: 8rpx;
}

.stat-label {
  font-size: 28rpx;
  color: #000000;
  line-height: 1.3;
}

.stat-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.stat-icon {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

.page-body {
  padding: 44rpx 24rpx 48rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-indicator {
  width: 6rpx;
  height: 32rpx;
  background-color: #236EFF;
  border-radius: 3rpx;
  margin-right: 14rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}

.empty-wrap {
  gap: 16rpx;
}

.empty-icon-img {
  width: 96rpx;
  height: 96rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #666;
  font-weight: 500;
}

.empty-sub {
  font-size: 24rpx;
  color: #aaa;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-card {
  background-color: #ffffff;
  border-radius: 32rpx;
  padding: 46rpx 28rpx 38rpx;
	box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0,0,0,0.05);
}

.card-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.service-icon {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-img {
  width: 100%;
  height: 100%;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.service-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  line-height: 1.5;
}

.time-row,
.addr-row {
  display: flex;
  color: #636D73;
  font-size: 26rpx;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.time-text {
  font-size: 26rpx;
  color: #636D73;
}

.addr-text {
  font-size: 26rpx;
  color: #636D73;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
	max-width: 460rpx;
}

.card-actions {
  display: flex;
  gap: 40rpx;
	margin-top: 70rpx;
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

.btn-outline {
  background: #ffffff;
  color: #236EFF;
  border: 1rpx solid #236EFF;
}

.btn-primary {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
  color: #ffffff;
  border: none;
}

.btn-primary[disabled] {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
  color: #ffffff;
  opacity: 0.5;
}

.btn::after {
  border: none;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e0eaff;
  border-top-color: #236EFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}
</style>
