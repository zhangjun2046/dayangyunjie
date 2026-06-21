<template>
  <view class="page">
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
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无待接单任务</text>
      <text class="empty-sub">下拉刷新可更新列表</text>
    </view>

    <!-- 任务卡片列表 -->
    <view v-else class="order-list">
      <view
        v-for="item in orders"
        :key="item.orderNo"
        class="order-card"
      >
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

        <!-- 操作按钮区 -->
        <view class="card-actions">
          <button class="btn btn-outline" @tap="handleViewDetail(item)">查看详情</button>
          <button
            class="btn btn-primary"
            :disabled="acceptingOrderNo === item.orderNo"
            @tap="handleAccept(item)"
          >
            {{ acceptingOrderNo === item.orderNo ? '接单中…' : '立即接单' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { fetchAssignedOrders, acceptOrder } from '@/api/order';
import type { AssignedOrderItem } from '@/api/order';

const authStore = useAuthStore();
const orders = ref<AssignedOrderItem[]>([]);
const loading = ref(false);
const acceptingOrderNo = ref<string | null>(null);

/** 加载 ASSIGNED 状态待接单列表 */
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

/** 页面每次显示时刷新列表 */
onShow(() => {
  loadOrders();
});

/** 下拉刷新 */
onPullDownRefresh(async () => {
  await loadOrders();
  uni.stopPullDownRefresh();
});

/** 立即接单：调 accept 接口，成功后从列表移除 */
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接单失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[home] acceptOrder failed, orderNo=', item.orderNo, 'err=', msg);
  } finally {
    acceptingOrderNo.value = null;
  }
}

/** 查看详情（P4.2 阶段暂未实现详情页） */
function handleViewDetail(_item: AssignedOrderItem): void {
  uni.showToast({ title: '详情功能开发中', icon: 'none' });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f0f5ff;
  padding: 24rpx 24rpx 48rpx;
  box-sizing: border-box;
}

/* 分区标题 */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-indicator {
  width: 6rpx;
  height: 32rpx;
  background-color: #1677ff;
  border-radius: 3rpx;
  margin-right: 14rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

/* 状态区（loading / empty） */
.status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
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
  color: #aaa;
}

/* 订单列表 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 单张卡片 */
.order-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx 28rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(22, 119, 255, 0.08);
}

/* 卡片主信息行 */
.card-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

/* 服务图标容器 */
.service-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-cleaning {
  background-color: #e8f5e9;
}

.icon-recycling {
  background-color: #fff3e0;
}

.icon-char {
  font-size: 44rpx;
  line-height: 1;
}

/* 卡片文字信息 */
.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.service-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}

.time-row,
.addr-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  font-size: 24rpx;
  flex-shrink: 0;
}

.time-text {
  font-size: 26rpx;
  color: #555;
}

.addr-text {
  font-size: 26rpx;
  color: #555;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮区 */
.card-actions {
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
  margin: 0;
  padding: 0;
}

.btn-outline {
  background-color: #ffffff;
  color: #1677ff;
  border: 2rpx solid #1677ff;
}

.btn-primary {
  background-color: #1677ff;
  color: #ffffff;
  border: none;
}

.btn-primary[disabled] {
  background-color: #91caff;
  color: #ffffff;
}

/* 消除 uni-app button 默认样式 */
.btn::after {
  border: none;
}

/* 加载动画 */
.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e0eaff;
  border-top-color: #1677ff;
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
