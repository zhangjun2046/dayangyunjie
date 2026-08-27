<template>
  <view class="page">
    <template v-if="loading || !order">
      <uni-nav-bar
        status-bar
        title="订单详情"
        left-icon="left"
        :border="false"
        @clickLeft="onBack"
      />
      <view class="loading-wrap">
        <view v-if="loading" class="loading-spinner" />
        <text class="loading-text">{{ loading ? '加载中…' : '订单加载失败，请返回重试' }}</text>
      </view>
    </template>

    <scroll-view v-else class="detail-scroll" scroll-y @scroll="onDetailScroll">
      <view class="hero">
        <image class="hero-bg" src="/static/images/icon_bj_n.png" mode="aspectFill" />
        <view class="nav-layer" :class="{ 'is-dark': navDark }">
          <uni-nav-bar
            :fixed="true"
            status-bar
            title="订单详情"
            :background-color="navBgColor"
            :color="navColor"
            left-icon="left"
            :border="false"
            @clickLeft="onBack"
          />
        </view>
        <view class="hero-body">
          <view class="status-header">
            <text class="status-item-name">{{ serviceName }}</text>
            <text class="order-no">订单编号：{{ order.orderNo }}</text>
            <text class="order-no">服务时间：{{ appointTimeText }}</text>
          </view>
          <view class="status-badge">
            <text class="badge-text">{{ statusTagLabel }}</text>
          </view>
        </view>
      </view>

      <view class="info-card contact-card">
        <view class="service-row">
          <view class="contact-left">
            <image class="avatar-icon-img" src="/static/icons/customer.png" mode="aspectFit" />
            <text class="contact-phone">{{ order.contactPhone }}</text>
          </view>
          <image
            class="phone-call-icon"
            src="/static/icons/icon_dianhua_n.png"
            mode="aspectFit"
            @tap="handleCall(order.contactPhone)"
          />
        </view>
      </view>

      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">订单信息</text>
        </view>

        <view class="info-row">
          <text class="info-label">计划服务时间</text>
          <text class="info-value">{{ planServiceTime }}</text>
        </view>
        <view v-if="orderType === 'cleaning'" class="info-row">
          <text class="info-label">预计服务时长</text>
          <text class="info-value">{{ serviceDurationText }}</text>
        </view>
        <view v-if="orderType === 'recycling'" class="info-row">
          <text class="info-label">预估重量</text>
          <text class="info-value">{{ estimatedWeightText }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系人姓名</text>
          <text class="info-value">{{ order.contactName }}</text>
        </view>
        <view class="info-row-space-between">
          <view class="info-row info-row--nested">
            <text class="info-label">联系人电话</text>
            <text class="info-value">{{ order.contactPhone }}</text>
          </view>
          <image
            class="phone-call-icon"
            src="/static/icons/icon_dianhua_n.png"
            mode="aspectFit"
            @tap="handleCall(order.contactPhone)"
          />
        </view>

        <view class="info-row">
          <text class="info-label">是否代客下单</text>
          <view v-if="order.isProxyOrder" class="proxy-label">
            <text class="proxy-tag-text">代下单</text>
          </view>
          <text v-else class="info-value">否</text>
        </view>

        <template v-if="order.isProxyOrder">
          <view class="info-row">
            <text class="info-label">被服务人姓名</text>
            <text class="info-value">{{ order.serviceContactName || '未填写' }}</text>
          </view>
          <view class="info-row-space-between">
            <view class="info-row info-row--nested">
              <text class="info-label">被服务人电话</text>
              <text class="info-value">{{ order.serviceContactPhone || '未填写' }}</text>
            </view>
            <image
              v-if="order.serviceContactPhone"
              class="phone-call-icon"
              src="/static/icons/icon_dianhua_n.png"
              mode="aspectFit"
              @tap="handleCall(order.serviceContactPhone)"
            />
          </view>
        </template>

        <view class="info-row-space-between">
          <view class="info-row info-row--nested">
            <text class="info-label">服务地址</text>
            <text class="info-value address-value">{{ addressText }}</text>
          </view>
          <image
            v-if="addressText"
            class="phone-call-icon"
            src="/static/icons/agreement.png"
            mode="aspectFit"
            @tap="handleCopyAddress"
          />
        </view>

        <view v-if="order.remark" class="info-row">
          <text class="info-label">备注信息</text>
          <text class="info-value remark-value">{{ order.remark }}</text>
        </view>
      </view>

      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">服务人员</text>
        </view>
        <view v-if="order.worker" class="service-row">
          <view class="contact-left worker-info-col">
            <text class="worker-name">{{ order.worker.name }}</text>
            <text class="contact-phone">{{ order.worker.phone }}</text>
          </view>
          <image
            v-if="order.worker.phone"
            class="phone-call-icon"
            src="/static/icons/icon_dianhua_n.png"
            mode="aspectFit"
            @tap="handleCall(order.worker.phone)"
          />
        </view>
        <text v-else class="pending-assign-tip">等待平台为客户分配服务人员</text>
      </view>

      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">服务进度</text>
        </view>
        <view class="timeline">
          <view
            v-for="(node, index) in order.progress"
            :key="node.eventKey ?? node.status"
            :class="['timeline-item', index < order.progress.length - 1 && 'timeline-item--has-line']"
          >
            <view v-if="node.status === 'CANCELLED'" class="timeline-dot-cancelled">
              <text class="cancel-cross-text">X</text>
            </view>
            <image
              v-else-if="node.state === 'done' || node.state === 'current'"
              class="timeline-dot-img"
              src="/static/icons/radio-checked.png"
              mode="aspectFit"
            />
            <view v-else class="timeline-dot" />
            <view v-if="index < order.progress.length - 1" class="timeline-line" />
            <view class="timeline-content">
              <text
                class="node-label"
                :class="{ 'node-label--cancelled': node.status === 'CANCELLED' }"
              >
                {{ node.label }}
              </text>
              <text v-if="node.message" class="node-desc">{{ node.message }}</text>
              <text v-if="node.operatedAt" class="node-time">{{ formatTs(node.operatedAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">作业记录</text>
        </view>
        <view class="photo-group">
          <view class="photo-group-header">
            <view
              :class="['photo-seq-badge', beforeWorkPhotos.length > 0 ? '' : 'photo-seq-badge--pending']"
            >
              <image
                v-if="beforeWorkPhotos.length > 0"
                class="photo-seq-icon"
                src="/static/icons/step-1.png"
                mode="aspectFit"
              />
              <text v-else class="photo-seq-text">1</text>
            </view>
            <text class="photo-group-label">服务前照片</text>
            <text class="photo-count-tip">{{ beforeWorkPhotos.length }} 张</text>
          </view>
          <view v-if="beforeWorkPhotos.length === 0" class="photo-empty-tip">
            <text class="photo-disabled-tip">暂无服务前照片</text>
          </view>
          <view v-else class="photo-grid">
            <view
              v-for="photo in beforeWorkPhotos"
              :key="photo.id"
              class="photo-thumb-wrap"
              @tap="previewPhotos(beforeWorkPhotos.map((p) => p.url), photo.url)"
            >
              <image class="photo-thumb" :src="photo.url" mode="aspectFill" />
            </view>
          </view>
        </view>
        <view class="photo-group">
          <view class="photo-group-header">
            <view
              :class="['photo-seq-badge', afterWorkPhotos.length > 0 ? '' : 'photo-seq-badge--pending']"
            >
              <image
                v-if="afterWorkPhotos.length > 0"
                class="photo-seq-icon"
                src="/static/icons/step-2.png"
                mode="aspectFit"
              />
              <text v-else class="photo-seq-text">2</text>
            </view>
            <text class="photo-group-label">服务后照片</text>
            <text class="photo-count-tip">{{ afterWorkPhotos.length }} 张</text>
          </view>
          <view v-if="afterWorkPhotos.length === 0" class="photo-empty-tip">
            <text class="photo-disabled-tip">暂无服务后照片</text>
          </view>
          <view v-else class="photo-grid">
            <view
              v-for="photo in afterWorkPhotos"
              :key="photo.id"
              class="photo-thumb-wrap"
              @tap="previewPhotos(afterWorkPhotos.map((p) => p.url), photo.url)"
            >
              <image class="photo-thumb" :src="photo.url" mode="aspectFill" />
            </view>
          </view>
        </view>
      </view>

      <view v-if="order.status === 'REVIEWED' && review" class="info-card">
        <text class="info-card-title">用户评价</text>
        <view class="review-stars-row">
          <text
            v-for="n in 5"
            :key="n"
            :class="['review-star', n <= review.rating ? 'review-star--filled' : 'review-star--empty']"
          >
            {{ n <= review.rating ? '★' : '☆' }}
          </text>
          <text class="review-rating-text">{{ review.rating }}.0 分</text>
        </view>
        <view v-if="review.tags && review.tags.length > 0" class="review-tags-row">
          <text v-for="tag in review.tags" :key="tag" class="review-tag-chip">{{ tag }}</text>
        </view>
        <text v-if="review.content" class="review-content">{{ review.content }}</text>
        <view v-if="review.images && review.images.length > 0" class="photo-grid review-images-grid">
          <view
            v-for="(imgUrl, idx) in review.images"
            :key="idx"
            class="photo-thumb-wrap"
            @tap="previewPhotos(review.images ?? [], imgUrl)"
          >
            <image class="photo-thumb" :src="imgUrl" mode="aspectFill" />
          </view>
        </view>
        <text class="review-time">评价时间：{{ formatTs(review.createdAt) }}</text>
      </view>

      <view :class="['bottom-spacer', hasBottomBar ? '' : 'bottom-spacer--done']" />
    </scroll-view>

    <view v-if="order && hasBottomBar" class="bottom-bar">
      <button class="start-btn" @tap="onAssignTap">
        <text class="start-btn-text">
          {{ order.status === 'ASSIGNED' ? '改派' : '分配服务人员' }}
        </text>
      </button>
    </view>

    <AssignWorkerPopup
      v-model:visible="assignVisible"
      :order-id="orderId"
      :order-type="orderType"
      :mode="assignMode"
      :current-worker-id="order?.worker?.id ?? null"
      @success="onAssignSuccess"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { onLoad, onShow, onPageScroll } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { ensureAuthed } from '@/composables/useRouteGuard';
import { fetchCleaningOrderDetail } from '@/api/cleaning';
import type { CleaningOrderDetail } from '@/api/cleaning';
import { fetchRecyclingOrderDetail } from '@/api/recycling';
import type { RecyclingOrderDetail } from '@/api/recycling';
import { fetchOrderReview } from '@/api/review';
import type { ReviewDto } from '@/api/review';
import { getOrderBadgeLabel } from '@/constants/order-status';
import AssignWorkerPopup from '@/components/AssignWorkerPopup.vue';

type OrderTab = 'cleaning' | 'recycling';
type AdminOrderDetail = CleaningOrderDetail | RecyclingOrderDetail;

const MENU_KEY: Record<OrderTab, string> = {
  cleaning: 'orders.cleaning',
  recycling: 'orders.recycling',
};

const authStore = useAuthStore();

const orderId = ref(0);
const orderType = ref<OrderTab>('cleaning');
const order = ref<AdminOrderDetail | null>(null);
const loading = ref(false);
const review = ref<ReviewDto | null>(null);
const assignVisible = ref(false);

const navDark = ref(false);
const heroThreshold = ref(80);
const navColor = computed(() => (navDark.value ? '#000000' : '#ffffff'));
const navBgColor = computed(() => (navDark.value ? '#ffffff' : 'transparent'));

const assignMode = computed<'assign' | 'reassign'>(() =>
  order.value?.status === 'ASSIGNED' ? 'reassign' : 'assign',
);

const hasBottomBar = computed(() => {
  const s = order.value?.status ?? '';
  return s === 'PENDING_ASSIGN' || s === 'ASSIGNED';
});

const serviceName = computed(() => order.value?.serviceItem ?? '服务订单');
const statusTagLabel = computed(() => getOrderBadgeLabel(order.value?.status ?? ''));

const serviceDurationText = computed(() => {
  if (!order.value || orderType.value !== 'cleaning') return '—';
  const duration = (order.value as CleaningOrderDetail).serviceDuration;
  return duration != null ? `${duration}小时` : '—';
});

const estimatedWeightText = computed(() => {
  if (!order.value || orderType.value !== 'recycling') return '—';
  const weight = (order.value as RecyclingOrderDetail).estimatedWeight;
  return weight != null ? `${weight}kg` : '—';
});

const appointTimeText = computed(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10);
  const slot = order.value.appointTimeSlot ?? '';
  return `${date} ${slot}`;
});

const planServiceTime = computed(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10);
  const slot = order.value.appointTimeSlot ?? '';
  return `${date} ${slot}`;
});

const addressText = computed(() => {
  const snap = order.value?.addressSnapshot;
  if (!snap) return '';
  return [snap.province, snap.city, snap.district, snap.detail, snap.buildingInfo]
    .filter(Boolean)
    .join('');
});

const beforeWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'BEFORE'),
);

const afterWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'AFTER'),
);

onLoad((query) => {
  orderId.value = Number(query?.id ?? query?.orderId ?? 0);
  const type = (query?.type ?? query?.orderType) as string;
  orderType.value = type === 'recycling' ? 'recycling' : 'cleaning';
  console.info('[order-detail] onLoad', orderId.value, orderType.value);
});

onShow(async () => {
  const ok = await ensureAuthed();
  if (!ok) return;

  await authStore.refreshPermissions();
  if (!authStore.hasMenu(MENU_KEY[orderType.value])) {
    uni.showToast({ title: '没有权限查看该订单', icon: 'none' });
    setTimeout(() => {
      onBack();
    }, 400);
    return;
  }

  await loadDetail();
});

async function loadDetail(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  navDark.value = false;
  try {
    order.value =
      orderType.value === 'cleaning'
        ? await fetchCleaningOrderDetail(orderId.value)
        : await fetchRecyclingOrderDetail(orderId.value);

    if (order.value?.status === 'REVIEWED') {
      review.value = await fetchOrderReview(orderType.value, orderId.value);
    } else {
      review.value = null;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    order.value = null;
  } finally {
    loading.value = false;
    if (order.value) {
      await nextTick();
      measureHero();
    }
  }
}

async function refreshDetail(): Promise<void> {
  if (!orderId.value) return;
  try {
    order.value =
      orderType.value === 'cleaning'
        ? await fetchCleaningOrderDetail(orderId.value)
        : await fetchRecyclingOrderDetail(orderId.value);
    if (order.value.status === 'REVIEWED') {
      review.value = await fetchOrderReview(orderType.value, orderId.value);
    } else {
      review.value = null;
    }
  } catch (err: unknown) {
    console.info('[order-detail] refresh failed', err);
  }
}

function measureHero() {
  uni.createSelectorQuery()
    .select('.hero')
    .boundingClientRect((rect) => {
      if (!rect || Array.isArray(rect)) return;
      const sys = uni.getSystemInfoSync();
      const navH = (sys.statusBarHeight || 0) + 44;
      heroThreshold.value = Math.max(rect.height - navH, 40);
    })
    .exec();
}

function updateNavByScroll(scrollTop: number) {
  navDark.value = scrollTop >= heroThreshold.value;
}

function onDetailScroll(e: { detail: { scrollTop: number } }) {
  updateNavByScroll(e.detail.scrollTop);
}

onPageScroll((e) => {
  updateNavByScroll(e.scrollTop);
});

function formatTs(ts: string | undefined | null): string {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())}:${pad(beijing.getUTCSeconds())}`;
}

function handleCall(phone?: string | null): void {
  const target = (phone || '').trim();
  if (!target) {
    uni.showToast({ title: '暂无联系电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({ phoneNumber: target });
}

function handleCopyAddress(): void {
  const address = addressText.value.trim();
  if (!address) {
    uni.showToast({ title: '暂无服务地址', icon: 'none' });
    return;
  }
  uni.setClipboardData({
    data: address,
    success: () => uni.showToast({ title: '地址已复制', icon: 'success' }),
  });
}

function previewPhotos(urls: string[], current: string): void {
  uni.previewImage({ current, urls: urls.length > 0 ? urls : [current] });
}

function onAssignTap(): void {
  assignVisible.value = true;
}

async function onAssignSuccess(): Promise<void> {
  await refreshDetail();
}

function onBack(): void {
  // H5 规范：有页面栈则返回上一页；刷新直进 / 无栈时回落到订单列表
  // 注意：H5 上 navigateBack 在无上一页时经常不进 fail，不能只依赖 fail 回调
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
    return;
  }
  uni.reLaunch({ url: '/pages/orders/index' });
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8faff;
  position: relative;
}

.detail-scroll {
  flex: 1;
  height: 0;
}

.nav-layer.is-dark :deep(.uni-nav-bar-text),
.nav-layer.is-dark :deep(.uni-icons) {
  color: #000000 !important;
}

.loading-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #e0e8f5;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.hero {
  position: relative;
  overflow: hidden;
  min-height: 360rpx;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.hero :deep(.uni-navbar) {
  z-index: 999;
}

.hero-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 32rpx 48rpx;
}

.status-header {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-right: 16rpx;
}

.status-item-name {
  color: #fff;
  font-size: 34rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.status-badge {
  margin-top: 30rpx;
  padding: 0 20rpx;
  height: 42rpx;
  min-width: 80rpx;
  border: 1rpx solid #fff;
  border-radius: 21rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-text {
  font-size: 24rpx;
  color: #ffffff;
}

.order-no {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-top: 10rpx;
  margin-bottom: 4rpx;
}

.contact-card {
  margin-top: 20rpx;
}

.service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.contact-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.worker-info-col {
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}

.worker-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.avatar-icon-img {
  width: 90rpx;
  height: 90rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.contact-phone {
  font-size: 24rpx;
  color: #58636a;
  letter-spacing: 2rpx;
}

.phone-call-icon {
  width: 60rpx;
  height: 60rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.pending-assign-tip {
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
}

.info-card {
  background: #ffffff;
  margin: 20rpx 24rpx;
  border-radius: 32rpx;
  padding: 28rpx 32rpx 16rpx;
  box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-section-title {
  margin-bottom: 20rpx;
  padding-bottom: 30rpx;
  padding-top: 10rpx;
  border-bottom: 1rpx solid #f7f9fa;
}

.section-title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.info-card-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #efefef;
}

.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.info-row--nested {
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
}

.info-row-space-between {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.info-label {
  font-size: 26rpx;
  color: #4c5760;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  line-height: 1.6;
}

.address-value,
.remark-value {
  word-break: break-all;
}

.proxy-label {
  margin-top: 4rpx;
}

.proxy-tag-text {
  font-size: 24rpx;
  color: #fa8c16;
  background: #fff7e0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.timeline {
  padding: 32rpx 0 8rpx;
}

.timeline-item {
  display: flex;
  align-items: stretch;
  gap: 28rpx;
  position: relative;
  min-height: 124rpx;
}

.timeline-item:not(.timeline-item--has-line) {
  min-height: auto;
}

.timeline-dot {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  box-sizing: border-box;
  background: #ffffff;
  border: 3rpx solid #d8dde5;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.timeline-dot-img {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.timeline-dot-cancelled {
  position: relative;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-cross-text {
  color: #ffffff;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1;
}

.timeline-line {
  position: absolute;
  left: 16rpx;
  top: 34rpx;
  bottom: 0;
  width: 2rpx;
  background: #e1e5eb;
}

.timeline-content {
  flex: 1;
  padding: 0 0 42rpx;
  min-width: 0;
}

.timeline-item:not(.timeline-item--has-line) .timeline-content {
  padding-bottom: 0;
}

.node-label {
  font-size: 30rpx;
  font-weight: 600;
  display: block;
  color: #25282d;
  line-height: 1.4;
}

.node-label--cancelled {
  color: #f56c6c;
}

.node-desc {
  font-size: 26rpx;
  color: #737982;
  display: block;
  line-height: 1.5;
  margin-top: 8rpx;
}

.node-time {
  font-size: 24rpx;
  color: #7d838c;
  display: block;
  margin-top: 6rpx;
}

.photo-group {
  padding: 16rpx 0;
}

.photo-group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.photo-seq-badge {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-seq-badge--pending {
  background: #d0d9e8;
}

.photo-seq-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

.photo-seq-icon {
  width: 40rpx;
  height: 40rpx;
}

.photo-group-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.photo-count-tip {
  font-size: 22rpx;
  color: #aaa;
  margin-left: auto;
}

.photo-empty-tip {
  padding: 16rpx 0 8rpx;
}

.photo-disabled-tip {
  font-size: 20rpx;
  color: #bbb;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 5rpx 0 8rpx;
}

.photo-thumb-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  background: #f5f5f5;
}

.photo-thumb {
  width: 100%;
  height: 100%;
}

.bottom-spacer {
  height: 170rpx;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: content-box;
}

.bottom-spacer--done {
  height: 48rpx;
}

.bottom-bar {
  position: fixed;
  z-index: 20;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.start-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  border-radius: 20rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.start-btn::after {
  display: none;
}

.start-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}

.review-stars-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4rpx;
  margin-bottom: 20rpx;
}

.review-star {
  font-size: 40rpx;
  line-height: 1;
}

.review-star--filled {
  color: #ff7804;
}

.review-star--empty {
  color: #e0e0e0;
}

.review-rating-text {
  font-size: 26rpx;
  color: #ff7804;
  margin-left: 8rpx;
  font-weight: 600;
}

.review-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.review-tag-chip {
  font-size: 24rpx;
  color: #0b7cc8;
  background: #f0f6ff;
  border-radius: 24rpx;
  padding: 6rpx 20rpx;
  line-height: 1.4;
}

.review-content {
  font-size: 26rpx;
  color: #555;
  line-height: 1.7;
  margin-bottom: 16rpx;
  word-break: break-all;
  display: block;
}

.review-images-grid {
  margin-bottom: 16rpx;
}

.review-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
</style>
