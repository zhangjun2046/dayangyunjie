<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中…</text>
    </view>

    <!-- 加载失败 / 无数据 -->
    <view v-else-if="!order" class="loading-wrap">
      <text class="loading-text">订单加载失败，请返回重试</text>
    </view>

    <!-- 详情内容 -->
    <scroll-view v-else class="detail-scroll" scroll-y>
      <!-- 状态卡片 -->
      <view class="status-card">
        <view class="status-header">
          <view class="status-badge" :class="getStatusClass(order.status)">
            <text class="badge-text">{{ getStatusLabel(order.status) }}</text>
          </view>
          <text class="order-no">{{ order.orderNo }}</text>
        </view>
        <text class="status-tip">{{ getStatusTip(order.status) }}</text>
      </view>

      <!-- 服务信息卡片 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务信息</text>
        </view>

        <!-- 保洁/废品订单信息 -->
        <template v-if="orderType !== 'consult'">
          <view class="info-row">
            <text class="info-label">服务类型</text>
            <text class="info-value">{{ getServiceName() }}</text>
          </view>
          <view v-if="orderType === 'cleaning'" class="info-row">
            <text class="info-label">服务时长</text>
            <text class="info-value">{{ (order as CleaningOrderDto).serviceDuration }}小时</text>
          </view>
          <view v-if="orderType === 'recycling'" class="info-row">
            <text class="info-label">预估重量</text>
            <text class="info-value">{{ (order as RecyclingOrderDto).estimatedWeight }}kg</text>
          </view>
          <view class="info-row">
            <text class="info-label">预约时间</text>
            <text class="info-value">{{ formatDate((order as CleaningOrderDto | RecyclingOrderDto).appointDate) }} {{ (order as CleaningOrderDto | RecyclingOrderDto).appointTimeSlot }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">服务地址</text>
            <text class="info-value">{{ getAddressText() }}</text>
          </view>
        </template>

        <!-- 家政咨询订单信息 -->
        <template v-else>
          <view class="info-row">
            <text class="info-label">咨询类型</text>
            <text class="info-value">{{ (order as ConsultOrderDto).serviceType }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">需求描述</text>
            <text class="info-value">{{ (order as ConsultOrderDto).requirementDesc }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">提交时间</text>
            <text class="info-value">{{ formatDate(order.createdAt) }}</text>
          </view>
        </template>
      </view>

      <!-- 联系人信息 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">联系人</text>
        </view>
        <view class="info-row">
          <text class="info-label">姓名</text>
          <text class="info-value">{{ order.contactName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ order.contactPhone }}</text>
        </view>

        <!-- 代下单：被服务人 -->
        <template v-if="order.isProxyOrder">
          <view class="divider" />
          <view class="proxy-label">
            <text class="proxy-tag-text">代下单</text>
          </view>
          <view class="info-row">
            <text class="info-label">被服务人</text>
            <text class="info-value">{{ order.serviceContactName || '未填写' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系方式</text>
            <text class="info-value">{{ order.serviceContactPhone || '未填写' }}</text>
          </view>
        </template>
      </view>

      <!-- 服务进度时间轴（保洁/废品） -->
      <view v-if="orderType !== 'consult'" class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务进度</text>
        </view>
        <OrderStatusTimeline
          :status="order.status"
          :order-type="orderType === 'cleaning' ? 'CLEANING' : 'RECYCLING'"
        />
      </view>

      <!-- 家政咨询进度时间轴 -->
      <view v-else class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务进度</text>
        </view>
        <OrderStatusTimeline :status="order.status" order-type="CONSULT" />
      </view>

      <!-- 待派单：服务人员占位 -->
      <view v-if="order.status === 'PENDING_ASSIGN'" class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务人员</text>
        </view>
        <view class="worker-placeholder">
          <text class="placeholder-text">等待平台为您分配服务人员</text>
        </view>
      </view>

      <!-- 备注 -->
      <view v-if="order.remark" class="info-card">
        <view class="card-title-row">
          <text class="card-title">备注</text>
        </view>
        <text class="remark-text">{{ order.remark }}</text>
      </view>

      <!-- 底部操作区占位（真实按钮在底部固定区） -->
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="order && hasActionButton" class="action-bar">
      <!-- 待派单：取消订单 -->
      <button
        v-if="order.status === 'PENDING_ASSIGN'"
        class="btn-cancel"
        @tap="onCancelOrder"
        :disabled="actionLoading"
      >
        {{ actionLoading ? '处理中…' : '取消订单' }}
      </button>

      <!-- 废品服务中：验收服务 -->
      <button
        v-if="orderType === 'recycling' && order.status === 'IN_SERVICE'"
        class="btn-primary"
        @tap="onResidentConfirm"
        :disabled="actionLoading"
      >
        {{ actionLoading ? '处理中…' : '验收服务' }}
      </button>

      <!-- 待评价（7天内）：去评价 -->
      <button
        v-if="canReview"
        class="btn-primary"
        @tap="onGoReview"
      >
        去评价
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchCleaningOrderDetail,
  cancelCleaningOrder,
  type CleaningOrderDto,
} from '@/api/cleaning-order';
import {
  fetchRecyclingOrderDetail,
  cancelRecyclingOrder,
  residentConfirmRecycling,
  type RecyclingOrderDto,
} from '@/api/recycling-order';
import {
  fetchConsultOrderDetail,
  type ConsultOrderDto,
} from '@/api/consult-order';
import OrderStatusTimeline from '@/components/OrderStatusTimeline.vue';

type OrderType = 'cleaning' | 'recycling' | 'consult';
type AnyOrder = (CleaningOrderDto | RecyclingOrderDto | ConsultOrderDto) & {
  id: number;
  orderNo: string;
  status: string;
  contactName: string;
  contactPhone: string;
  isProxyOrder?: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  remark?: string | null;
  createdAt: string;
};

const authStore = useAuthStore();
const loading = ref(true);
const actionLoading = ref(false);
const order = ref<AnyOrder | null>(null);
const orderType = ref<OrderType>('cleaning');
const orderId = ref<number>(0);

// uni-app 页面参数必须通过 onLoad 获取，onMounted 在 mp-weixin 无法读到路由参数
onLoad((options) => {
  orderId.value = parseInt((options as Record<string, string>)?.id || '0', 10);
  orderType.value = ((options as Record<string, string>)?.type || 'cleaning') as OrderType;
  console.info(`[order-detail] onLoad id=${orderId.value} type=${orderType.value}`);
  loadDetail();
});

async function loadDetail() {
  loading.value = true;
  try {
    if (orderType.value === 'cleaning') {
      order.value = (await fetchCleaningOrderDetail(orderId.value)) as unknown as AnyOrder;
    } else if (orderType.value === 'recycling') {
      order.value = (await fetchRecyclingOrderDetail(orderId.value)) as unknown as AnyOrder;
    } else {
      order.value = (await fetchConsultOrderDetail(orderId.value)) as unknown as AnyOrder;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[order-detail] loadDetail error', e);
  } finally {
    loading.value = false;
  }
}

/** 是否有底部操作按钮 */
const hasActionButton = computed(() => {
  if (!order.value) return false;
  const s = order.value.status;
  // 待派单：取消
  if (s === 'PENDING_ASSIGN') return true;
  // 废品服务中：验收
  if (orderType.value === 'recycling' && s === 'IN_SERVICE') return true;
  // 待评价且7天内：评价
  if (canReview.value) return true;
  return false;
});

/** 是否可以评价（PENDING_REVIEW + 7天内）仅保洁/废品 */
const canReview = computed(() => {
  if (!order.value) return false;
  if (orderType.value === 'consult') return false;
  if (order.value.status !== 'PENDING_REVIEW') return false;
  // 7天内校验：基于 updatedAt 或 createdAt
  const updated = (order.value as CleaningOrderDto).updatedAt || order.value.createdAt;
  if (!updated) return true;
  const diff = Date.now() - new Date(updated).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
});

/** 取消订单 */
async function onCancelOrder() {
  const residentId = authStore.resident?.id;
  if (!residentId || !order.value) return;

  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认取消',
      content: '确定取消该订单吗？',
      success: (res) => resolve(res.confirm),
    });
  });

  if (!confirmed) return;

  actionLoading.value = true;
  try {
    if (orderType.value === 'cleaning') {
      order.value = (await cancelCleaningOrder(orderId.value, residentId)) as unknown as AnyOrder;
    } else if (orderType.value === 'recycling') {
      order.value = (await cancelRecyclingOrder(orderId.value, residentId)) as unknown as AnyOrder;
    }
    uni.showToast({ title: '订单已取消', icon: 'success' });
    console.info(`[order-detail] cancelled orderId=${orderId.value}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '取消失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

/** 废品验收服务 */
async function onResidentConfirm() {
  const residentId = authStore.resident?.id;
  if (!residentId || !order.value) return;

  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认验收',
      content: '确认服务人员已完成服务，提交验收吗？',
      success: (res) => resolve(res.confirm),
    });
  });

  if (!confirmed) return;

  actionLoading.value = true;
  try {
    order.value = (await residentConfirmRecycling(orderId.value, residentId)) as unknown as AnyOrder;
    uni.showToast({ title: '验收成功', icon: 'success' });
    console.info(`[order-detail] residentConfirm orderId=${orderId.value}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '验收失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

/** 跳转评价页（P3.7 实现，此处预留入口） */
function onGoReview() {
  uni.showToast({ title: '评价功能即将上线', icon: 'none' });
}

function getServiceName(): string {
  if (orderType.value === 'cleaning') return (order.value as CleaningOrderDto).serviceItem || '';
  if (orderType.value === 'recycling') return (order.value as RecyclingOrderDto).serviceItem || '';
  return '';
}

function getAddressText(): string {
  const snapshot = (order.value as CleaningOrderDto).addressSnapshot as Record<string, unknown> | null | undefined;
  if (!snapshot) return '未设置';
  return (snapshot.detail as string) || (snapshot.address as string) || '未设置';
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}

function getStatusLabel(status: string): string {
  if (orderType.value === 'consult') {
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
    REVIEWED: '已完成',
    CANCELLED: '已取消',
  };
  return map[status] || status;
}

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

function getStatusTip(status: string): string {
  const tips: Record<string, string> = {
    PENDING_ASSIGN: '订单已提交，等待平台安排服务人员',
    ASSIGNED: '已为您分配服务人员，请等待上门',
    ACCEPTED: '服务人员已确认接单，准备上门',
    IN_SERVICE: '服务人员正在为您服务',
    PENDING_REVIEW: '服务已完成，期待您的评价',
    REVIEWED: '感谢您的评价',
    CANCELLED: '订单已取消',
    FOLLOW_UP: '咨询单已提交，等待跟进',
    FOLLOWING: '运营人员正在跟进您的需求',
    COMPLETED: '服务已完成',
  };
  return tips[status] || '';
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.detail-scroll {
  flex: 1;
}

/* 状态卡片 */
.status-card {
  background: #1677ff;
  padding: 40rpx 32rpx 32rpx;
  margin-bottom: 20rpx;
}

.status-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.status-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.25);
}

.badge-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.order-no {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.status-tip {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* 信息卡片 */
.info-card {
  background: #ffffff;
  margin: 0 0 16rpx;
  padding: 28rpx 32rpx;
}

.card-title-row {
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.info-label {
  font-size: 26rpx;
  color: #999;
  width: 160rpx;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

.divider {
  height: 1rpx;
  background: #f5f5f5;
  margin: 16rpx 0;
}

.proxy-label {
  margin-bottom: 12rpx;
}

.proxy-tag-text {
  font-size: 24rpx;
  color: #fa8c16;
  background: #fff7e0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

/* 服务人员占位 */
.worker-placeholder {
  padding: 24rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 26rpx;
  color: #999;
}

.remark-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}

.bottom-placeholder {
  height: 140rpx;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  flex-direction: row;
  gap: 20rpx;
}

.btn-cancel,
.btn-primary {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
  line-height: 88rpx;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-primary {
  background: #1677ff;
  color: #ffffff;
}

.btn-cancel[disabled],
.btn-primary[disabled] {
  opacity: 0.6;
}

/* 覆盖状态卡片中 badge 颜色（detail 卡片用 fixed 背景） */
.status-card .badge-blue,
.status-card .badge-orange,
.status-card .badge-green,
.status-card .badge-grey {
  background: rgba(255, 255, 255, 0.25);
}
</style>
