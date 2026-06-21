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

      <!-- 我的评价（订单已完成时展示） -->
      <view v-if="review && orderType !== 'consult'" class="info-card review-card">
        <view class="card-title-row review-card-header">
          <text class="card-title">我的评价</text>
          <text class="review-date-text">{{ formatDate(review.createdAt) }}</text>
        </view>
        <!-- 星级 -->
        <view class="review-stars-row">
          <text
            v-for="n in 5"
            :key="n"
            class="review-star"
            :class="n <= review.rating ? 'star-lit' : 'star-dim'"
          >★</text>
          <text class="review-rating-label">{{ review.rating }}分</text>
        </view>
        <!-- 快捷标签 -->
        <view v-if="review.tags && review.tags.length" class="review-tags-row">
          <view v-for="tag in review.tags" :key="tag" class="review-tag">
            <text class="review-tag-text">{{ tag }}</text>
          </view>
        </view>
        <!-- 文字评价 -->
        <text v-if="review.content" class="review-content-text">{{ review.content }}</text>
        <!-- 评价图片 -->
        <view v-if="review.images && review.images.length" class="review-images-row">
          <image
            v-for="(img, idx) in review.images"
            :key="idx"
            class="review-img"
            :src="img"
            mode="aspectFill"
            @tap="onPreviewReviewImage(idx)"
          />
        </view>
      </view>

      <!-- 投诉进度卡片（有投诉记录时显示） -->
      <view v-if="complaint" class="info-card complaint-card" @tap="onViewComplaintDetail">
        <view class="card-title-row complaint-card-header">
          <text class="card-title">投诉反馈</text>
          <view class="complaint-status-badge" :class="getComplaintStatusClass(complaint.status)">
            <text class="complaint-status-text">{{ COMPLAINT_STATUS_LABELS[complaint.status] }}</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">投诉原因</text>
          <text class="info-value">
            {{ COMPLAINT_REASON_LABELS[complaint.reason as ComplaintReason] || complaint.reason }}
          </text>
        </view>
        <view class="complaint-view-more">
          <text class="view-more-text">查看投诉进度 ›</text>
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

      <!-- ACCEPTED 及以后（保洁/废品）：投诉反馈 + 联系客服 + 可选评价 -->
      <template v-if="canComplaint">
        <button class="btn-outline" @tap="onGoComplaint">投诉反馈</button>
        <button class="btn-outline" @tap="onCallService">联系客服</button>
      </template>

      <!-- 待评价（7天内）：评价服务 -->
      <button
        v-if="canReview"
        class="btn-primary"
        @tap="onGoReview"
      >
        评价服务
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
  type RecyclingOrderDto,
} from '@/api/recycling-order';
import {
  fetchConsultOrderDetail,
  type ConsultOrderDto,
} from '@/api/consult-order';
import {
  getComplaints,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_REASON_LABELS,
  type ComplaintDto,
  type ComplaintReason,
} from '@/api/complaint';
import { fetchReviewByOrder, type ReviewDto } from '@/api/review';
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
const complaint = ref<ComplaintDto | null>(null);
const review = ref<ReviewDto | null>(null);

// uni-app 页面参数必须通过 onLoad 获取，onMounted 在 mp-weixin 无法读到路由参数
onLoad((options) => {
  orderId.value = parseInt((options as Record<string, string>)?.id || '0', 10);
  orderType.value = ((options as Record<string, string>)?.type || 'cleaning') as OrderType;
  console.info(`[order-detail] onLoad id=${orderId.value} type=${orderType.value}`);
  loadDetail();
  loadComplaint();
  if (orderType.value !== 'consult') {
    loadReview();
  }
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

/** 加载当前订单的投诉记录（仅保洁/废品） */
async function loadComplaint() {
  if (orderType.value === 'consult') return;
  try {
    const res = await getComplaints({
      orderId: orderId.value,
      orderType: orderType.value.toUpperCase() as 'CLEANING' | 'RECYCLING',
      pageSize: 1,
    });
    complaint.value = res.items[0] ?? null;
    console.info(`[order-detail] loadComplaint orderId=${orderId.value} found=${!!complaint.value}`);
  } catch (e) {
    console.info('[order-detail] loadComplaint error', e);
  }
}

/** 加载当前订单的评价记录（仅保洁/废品，REVIEWED 状态时有值） */
async function loadReview() {
  try {
    const type = orderType.value === 'cleaning' ? 'CLEANING' : 'RECYCLING';
    review.value = await fetchReviewByOrder(orderId.value, type);
    console.info(`[order-detail] loadReview orderId=${orderId.value} found=${!!review.value}`);
  } catch (e) {
    console.info('[order-detail] loadReview error', e);
  }
}

/** 预览评价图片 */
function onPreviewReviewImage(startIdx: number) {
  if (!review.value?.images?.length) return;
  uni.previewImage({
    current: startIdx,
    urls: review.value.images as string[],
  });
}

/** 跳转投诉进度详情页 */
function onViewComplaintDetail() {
  if (!complaint.value) return;
  uni.navigateTo({ url: `/pages/complaint-detail/index?complaintId=${complaint.value.id}` });
  console.info(`[order-detail] view complaint detail id=${complaint.value.id}`);
}

/** 客服电话常量 */
const CUSTOMER_SERVICE_PHONE = '400-888-0000';

/** 是否有底部操作按钮 */
const hasActionButton = computed(() => {
  if (!order.value) return false;
  const s = order.value.status;
  if (s === 'PENDING_ASSIGN') return true;
  if (canReview.value) return true;
  if (canComplaint.value) return true;
  return false;
});

/** 是否可以评价（PENDING_REVIEW + 7天内）仅保洁/废品 */
const canReview = computed(() => {
  if (!order.value) return false;
  if (orderType.value === 'consult') return false;
  if (order.value.status !== 'PENDING_REVIEW') return false;
  const updated = (order.value as CleaningOrderDto).updatedAt || order.value.createdAt;
  if (!updated) return true;
  const diff = Date.now() - new Date(updated).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
});

/** 是否可以投诉（ACCEPTED 及之后状态，仅保洁/废品） */
const canComplaint = computed(() => {
  if (!order.value) return false;
  if (orderType.value === 'consult') return false;
  const complaintStatuses = ['ACCEPTED', 'IN_SERVICE', 'PENDING_REVIEW', 'REVIEWED'];
  return complaintStatuses.includes(order.value.status);
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

/** 跳转评价页 */
function onGoReview() {
  if (!order.value) return;
  uni.navigateTo({
    url: `/pages/review/index?orderId=${orderId.value}&orderType=${orderType.value.toUpperCase()}&orderNo=${encodeURIComponent(order.value.orderNo || '')}`,
  });
  console.info(`[order-detail] go review orderId=${orderId.value}`);
}

/** 跳转投诉页 */
function onGoComplaint() {
  if (!order.value) return;
  uni.navigateTo({
    url: `/pages/complaint/index?orderId=${orderId.value}&orderType=${orderType.value.toUpperCase()}&orderNo=${encodeURIComponent(order.value.orderNo || '')}`,
  });
  console.info(`[order-detail] go complaint orderId=${orderId.value}`);
}

/** 联系客服 */
function onCallService() {
  uni.makePhoneCall({ phoneNumber: CUSTOMER_SERVICE_PHONE });
  console.info('[order-detail] call service phone');
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

function getComplaintStatusClass(status: string): string {
  if (status === 'PENDING') return 'cs-orange';
  if (status === 'PROCESSING') return 'cs-blue';
  return 'cs-green';
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

.btn-outline {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 88rpx;
  border: 1rpx solid #1677ff;
  background: #ffffff;
  color: #1677ff;
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

/* 投诉进度卡片 */
.complaint-card {
  border-left: 6rpx solid #fa8c16;
}

.complaint-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.complaint-status-badge {
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
}

.cs-orange {
  background: #fff7e0;
}

.cs-blue {
  background: #e6f4ff;
}

.cs-green {
  background: #f6ffed;
}

.complaint-status-text {
  font-size: 24rpx;
  font-weight: 500;
}

.cs-orange .complaint-status-text {
  color: #fa8c16;
}

.cs-blue .complaint-status-text {
  color: #1677ff;
}

.cs-green .complaint-status-text {
  color: #52c41a;
}

.complaint-view-more {
  margin-top: 8rpx;
  display: flex;
  justify-content: flex-end;
}

.view-more-text {
  font-size: 24rpx;
  color: #1677ff;
}

/* 我的评价卡片 */
.review-card {
  border-left: 6rpx solid #52c41a;
}

.review-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.review-date-text {
  font-size: 24rpx;
  color: #999;
}

.review-stars-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4rpx;
  margin-bottom: 16rpx;
}

.review-star {
  font-size: 44rpx;
  line-height: 1;
}

.star-lit {
  color: #faad14;
}

.star-dim {
  color: #e0e0e0;
}

.review-rating-label {
  font-size: 26rpx;
  color: #faad14;
  font-weight: 600;
  margin-left: 8rpx;
}

.review-tags-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.review-tag {
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  background: #f6ffed;
  border: 1rpx solid #b7eb8f;
}

.review-tag-text {
  font-size: 24rpx;
  color: #52c41a;
}

.review-content-text {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
  display: block;
  margin-bottom: 16rpx;
}

.review-images-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 4rpx;
}

.review-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
}
</style>
