<template>
  <view class="page">
    <!-- 状态筛选标签栏 -->
    <view class="tab-bar">
      <view
        v-for="tab in TABS"
        :key="tab.value"
        class="tab-item"
        :class="activeTab === tab.value ? 'tab-item-active' : ''"
        @tap="onSwitchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中…</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading && items.length === 0" class="state-wrap">
      <text class="state-icon">��</text>
      <text class="state-text">暂无投诉记录</text>
    </view>

    <!-- 列表 -->
    <scroll-view v-else class="list-scroll" scroll-y @scrolltolower="onLoadMore">
      <view
        v-for="item in items"
        :key="item.id"
        class="complaint-card"
        @tap="onGoDetail(item.id)"
      >
        <!-- 卡片头部：订单类型 + 状态徽章 -->
        <view class="card-header">
          <view class="order-type-badge">
            <text class="order-type-text">{{ ORDER_TYPE_LABELS[item.orderType] || item.orderType }}</text>
          </view>
          <view class="status-badge" :class="getStatusClass(item.status)">
            <text class="status-text">{{ COMPLAINT_STATUS_LABELS[item.status] }}</text>
          </view>
        </view>

        <!-- 投诉原因 -->
        <view class="card-row">
          <text class="card-label">投诉原因</text>
          <text class="card-value">{{ COMPLAINT_REASON_LABELS[item.reason as ComplaintReason] || item.reason }}</text>
        </view>

        <!-- 投诉描述（最多2行） -->
        <text class="card-desc">{{ item.description }}</text>

        <!-- 卡片底部：提交时间 + 箭头 -->
        <view class="card-footer">
          <text class="card-time">{{ formatDate(item.createdAt) }}</text>
          <text class="card-arrow">查看进度 ›</text>
        </view>
      </view>

      <!-- 加载更多 / 底部提示 -->
      <view class="list-bottom">
        <text v-if="loadingMore" class="bottom-text">加载中…</text>
        <text v-else-if="noMore" class="bottom-text">— 没有更多了 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import {
  getComplaints,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_REASON_LABELS,
  type ComplaintDto,
  type ComplaintStatus,
  type ComplaintReason,
} from '@/api/complaint';
import { useAuthStore } from '@/store/auth';

const ORDER_TYPE_LABELS: Record<string, string> = {
  CLEANING: '保洁服务',
  RECYCLING: '废品回收',
  CONSULT: '家政咨询',
};

type TabValue = 'ALL' | ComplaintStatus;

const TABS: { label: string; value: TabValue }[] = [
  { label: '全部', value: 'ALL' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已完成', value: 'COMPLETED' },
];

const authStore = useAuthStore();
const activeTab = ref<TabValue>('ALL');
const items = ref<ComplaintDto[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const page = ref(1);
const total = ref(0);
const PAGE_SIZE = 10;

const noMore = computed(() => !loadingMore.value && items.value.length >= total.value && items.value.length > 0);

onLoad(() => {
  loadList(true);
});

onShow(() => {
  // 每次显示页面时刷新，以便投诉提交后状态能及时更新
  loadList(true);
});

function onSwitchTab(val: TabValue) {
  if (activeTab.value === val) return;
  activeTab.value = val;
  loadList(true);
}

async function loadList(reset = false) {
  const residentId = authStore.resident?.id;
  if (!residentId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  if (reset) {
    page.value = 1;
    items.value = [];
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const res = await getComplaints({
      residentId,
      status: activeTab.value === 'ALL' ? undefined : activeTab.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    });

    total.value = res.total;
    if (reset) {
      items.value = res.items;
    } else {
      items.value = [...items.value, ...res.items];
    }
    console.info(`[complaint-list] loaded residentId=${residentId} tab=${activeTab.value} total=${res.total}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[complaint-list] loadList error', e);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function onLoadMore() {
  if (loadingMore.value || noMore.value) return;
  page.value += 1;
  loadList(false);
}

function onGoDetail(complaintId: number) {
  uni.navigateTo({ url: `/pages/complaint-detail/index?complaintId=${complaintId}` });
  console.info(`[complaint-list] go detail complaintId=${complaintId}`);
}

function getStatusClass(status: ComplaintStatus): string {
  if (status === 'PENDING') return 'badge-orange';
  if (status === 'PROCESSING') return 'badge-blue';
  return 'badge-green';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  flex-direction: row;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  padding: 28rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-item-active {
  border-bottom: 4rpx solid #236EFF;
}

.tab-text {
  font-size: 26rpx;
  color: #999;
}

.tab-item-active .tab-text {
  color: #236EFF;
  font-weight: 600;
}

/* 状态占位 */
.state-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 160rpx;
  gap: 24rpx;
}

.state-icon {
  font-size: 80rpx;
}

.state-text {
  font-size: 28rpx;
  color: #999;
}

/* 列表滚动区 */
.list-scroll {
  flex: 1;
}

/* 投诉卡片 */
.complaint-card {
  background: #ffffff;
  margin: 16rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.order-type-badge {
  background: #f0f5ff;
  border-radius: 8rpx;
  padding: 6rpx 16rpx;
}

.order-type-text {
  font-size: 22rpx;
  color: #236EFF;
  font-weight: 500;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.badge-orange {
  background: #fff7e0;
}

.badge-blue {
  background: #e6f4ff;
}

.badge-green {
  background: #f6ffed;
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.badge-orange .status-text {
  color: #fa8c16;
}

.badge-blue .status-text {
  color: #236EFF;
}

.badge-green .status-text {
  color: #52c41a;
}

.card-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}

.card-label {
  font-size: 24rpx;
  color: #999;
  width: 120rpx;
  flex-shrink: 0;
}

.card-value {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.card-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.card-time {
  font-size: 22rpx;
  color: #bbb;
}

.card-arrow {
  font-size: 22rpx;
  color: #236EFF;
}

/* 底部加载提示 */
.list-bottom {
  padding: 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-text {
  font-size: 24rpx;
  color: #ccc;
}
</style>
