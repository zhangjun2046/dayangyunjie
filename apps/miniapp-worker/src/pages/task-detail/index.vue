<template>
  <view class="page">
    <!-- 加载中 / 失败：保留可返回的导航 -->
    <template v-if="loading || !order">
      <uni-nav-bar
        status-bar
        title="任务详情"
        left-icon="left"
        :border="false"
        @clickLeft="onBack"
      />
      <view class="loading-wrap">
        <view v-if="loading" class="loading-spinner" />
        <text class="loading-text">{{ loading ? '加载中…' : '订单加载失败，请返回重试' }}</text>
      </view>
    </template>

    <!-- 详情内容 -->
    <scroll-view v-else class="detail-scroll" scroll-y @scroll="onDetailScroll">
      <!-- 沉浸式头部：头图顶到屏幕最上，导航透明浮在上面 -->
      <view class="hero">
        <image class="hero-bg" src="/static/images/icon_bj_n.png" mode="aspectFill" />
        <view class="nav-layer" :class="{ 'is-dark': navDark }">
          <uni-nav-bar
            :fixed="true"
            status-bar
            title="任务详情"
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

      <!-- ===== 客户联系信息条（对齐居民端服务人员卡片） ===== -->
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

      <!-- ===== 订单信息卡 ===== -->
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
          <text class="info-value">{{ order.serviceDuration != null ? `${order.serviceDuration}小时` : '—' }}</text>
        </view>
        <view v-if="orderType === 'recycling'" class="info-row">
          <text class="info-label">预估重量</text>
          <text class="info-value">{{ order.estimatedWeight != null ? `${order.estimatedWeight}kg` : '—' }}</text>
        </view>
        <view v-if="recyclingItemNames" class="info-row">
          <text class="info-label">回收物品</text>
          <text class="info-value">{{ recyclingItemNames }}</text>
        </view>
        <view v-if="recyclingElevatorText" class="info-row">
          <text class="info-label">是否有电梯</text>
          <text class="info-value">{{ recyclingElevatorText }}</text>
        </view>
        <view v-if="recyclingCarryFloorText" class="info-row">
          <text class="info-label">搬运楼层</text>
          <text class="info-value">{{ recyclingCarryFloorText }}</text>
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

        <view v-if="order.remark || order.notes" class="info-row">
          <text class="info-label">备注信息</text>
          <text class="info-value remark-value">{{ order.remark || order.notes }}</text>
        </view>
      </view>

      <!-- ===== 服务进度时间轴 ===== -->
      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">服务进度</text>
        </view>

        <view class="timeline">
          <view
            v-for="(node, index) in order.progress"
            :key="node.status"
            :class="['timeline-item', index < order.progress.length - 1 && 'timeline-item--has-line']"
          >
            <!-- 节点圆圈：已完成为蓝底白勾，取消为红底白叉，未到达为空心灰圈 -->
            <view v-if="node.status === 'CANCELLED'" class="timeline-dot-cancelled">
              <text class="cancel-cross-text">X</text>
            </view>
            <image
              v-else-if="
                node.state === 'done' ||
                node.state === 'current'
              "
              class="timeline-dot-img"
              src="/static/icons/radio-checked.png"
              mode="aspectFit"
            />
            <view v-else class="timeline-dot" />
            <!-- 连接线 -->
            <view v-if="index < order.progress.length - 1" class="timeline-line" />
            <!-- 节点内容 -->
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

      <!-- ===== 作业记录区 ===== -->
      <view class="info-card">
        <view class="card-section-title">
          <text class="section-title-text">作业记录</text>
        </view>

        <!-- ── 禁用态（ASSIGNED / ACCEPTED）：灰色占位，点击 toast 引导 ── -->
        <template v-if="workAreaState === 'disabled'">
          <view class="photo-group">
            <view class="photo-group-header">
              <view class="photo-seq-badge photo-seq-badge--pending">
                <text class="photo-seq-text">1</text>
              </view>
              <text class="photo-group-label">上传服务前照片</text>
            </view>
            <view class="photo-upload-wrap photo-upload-wrap--disabled" @tap="handleDisabledPhotoTap">
              <image class="photo-upload-area" src="/static/icons/add-photo.png" mode="aspectFit" />
              <text class="photo-disabled-tip">开始服务后可上传</text>
            </view>
          </view>
          <view class="photo-group">
            <view class="photo-group-header">
              <view class="photo-seq-badge photo-seq-badge--pending">
                <text class="photo-seq-text">2</text>
              </view>
              <text class="photo-group-label">上传服务后照片</text>
            </view>
            <view class="photo-upload-wrap photo-upload-wrap--disabled" @tap="handleDisabledPhotoTap">
              <image class="photo-upload-area" src="/static/icons/add-photo.png" mode="aspectFit" />
              <text class="photo-disabled-tip">开始服务后可上传</text>
            </view>
          </view>
        </template>

        <!-- ── 服务中（IN_SERVICE）：可上传编辑 ── -->
        <template v-else-if="workAreaState === 'active'">
          <!-- 上传前照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view :class="['photo-seq-badge', beforePhotos.length > 0 ? '' : 'photo-seq-badge--pending']">
                <image v-if="beforePhotos.length > 0" class="photo-seq-icon" src="/static/icons/step-1.png" mode="aspectFit" />
                <text v-else class="photo-seq-text">1</text>
              </view>
              <text class="photo-group-label">上传服务前照片</text>
              <text class="photo-count-tip">{{ beforePhotos.length }}/9</text>
            </view>
            <view class="photo-grid">
              <view
                v-for="(url, idx) in beforePhotos"
                :key="url"
                class="photo-thumb-wrap"
              >
                <RemoteImage
                  class="photo-thumb"
                  :src="url"
                  mode="aspectFill"
                  @tap="previewWorkPhotos(beforePhotos, idx)"
                />
                <view class="photo-delete-btn" @tap="removePhoto('before', idx)">
                  <text class="photo-delete-icon">✕</text>
                </view>
              </view>
              <view
                v-if="beforePhotos.length < 9"
                :class="['photo-add-btn', uploadingBefore && 'photo-add-btn--loading']"
                @tap="handleAddPhoto('before')"
              >
                <text v-if="uploadingBefore" class="photo-uploading-icon">⏳</text>
                <image v-else class="photo-upload-area" src="/static/icons/add-photo.png" mode="aspectFit" />
              </view>
            </view>
          </view>
          <!-- 上传后照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view :class="['photo-seq-badge', afterPhotos.length > 0 ? '' : 'photo-seq-badge--pending']">
                <image v-if="afterPhotos.length > 0" class="photo-seq-icon" src="/static/icons/step-2.png" mode="aspectFit" />
                <text v-else class="photo-seq-text">2</text>
              </view>
              <text class="photo-group-label">上传服务后照片</text>
              <text class="photo-count-tip">{{ afterPhotos.length }}/9</text>
            </view>
            <view class="photo-grid">
              <view
                v-for="(url, idx) in afterPhotos"
                :key="url"
                class="photo-thumb-wrap"
              >
                <RemoteImage
                  class="photo-thumb"
                  :src="url"
                  mode="aspectFill"
                  @tap="previewWorkPhotos(afterPhotos, idx)"
                />
                <view class="photo-delete-btn" @tap="removePhoto('after', idx)">
                  <text class="photo-delete-icon">✕</text>
                </view>
              </view>
              <view
                v-if="afterPhotos.length < 9"
                :class="['photo-add-btn', uploadingAfter && 'photo-add-btn--loading']"
                @tap="handleAddPhoto('after')"
              >
                <text v-if="uploadingAfter" class="photo-uploading-icon">⏳</text>
                <image v-else class="photo-upload-area" src="/static/icons/add-photo.png" mode="aspectFit" />
              </view>
            </view>
          </view>
        </template>

        <!-- ── 只读态（PENDING_REVIEW / REVIEWED）：按 photoType 分服务前/后 ── -->
        <template v-else>
          <!-- 服务前照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view :class="['photo-seq-badge', beforeWorkPhotos.length > 0 ? '' : 'photo-seq-badge--pending']">
                <image v-if="beforeWorkPhotos.length > 0" class="photo-seq-icon" src="/static/icons/step-1.png" mode="aspectFit" />
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
                v-for="(photo, idx) in beforeWorkPhotos"
                :key="photo.id"
                class="photo-thumb-wrap"
                @tap="previewWorkPhotos(beforeWorkPhotos.map((p) => p.url), idx)"
              >
                <RemoteImage class="photo-thumb" :src="photo.url" mode="aspectFill" />
              </view>
            </view>
          </view>
          <!-- 服务后照片 -->
          <view class="photo-group">
            <view class="photo-group-header">
              <view :class="['photo-seq-badge', afterWorkPhotos.length > 0 ? '' : 'photo-seq-badge--pending']">
                <image v-if="afterWorkPhotos.length > 0" class="photo-seq-icon" src="/static/icons/step-2.png" mode="aspectFit" />
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
                v-for="(photo, idx) in afterWorkPhotos"
                :key="photo.id"
                class="photo-thumb-wrap"
                @tap="previewWorkPhotos(afterWorkPhotos.map((p) => p.url), idx)"
              >
                <RemoteImage class="photo-thumb" :src="photo.url" mode="aspectFill" />
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- ===== 用户评价（仅 REVIEWED 状态且已加载到评价数据时展示）===== -->
      <view v-if="order.status === 'REVIEWED' && review" class="info-card">
        <text class="info-card-title">用户评价</text>

        <!-- 星级 -->
        <view class="review-stars-row">
          <text
            v-for="n in 5"
            :key="n"
            :class="['review-star', n <= review.rating ? 'review-star--filled' : 'review-star--empty']"
          >{{ n <= review.rating ? '★' : '☆' }}</text>
          <text class="review-rating-text">{{ review.rating }}.0 分</text>
        </view>

        <!-- 标签 -->
        <view v-if="review.tags && review.tags.length > 0" class="review-tags-row">
          <text v-for="tag in review.tags" :key="tag" class="review-tag-chip">{{ tag }}</text>
        </view>

        <!-- 文字评价 -->
        <text v-if="review.content" class="review-content">{{ review.content }}</text>

        <!-- 图片网格（复用已有样式） -->
        <view v-if="review.images && review.images.length > 0" class="photo-grid review-images-grid">
          <view
            v-for="(imgUrl, idx) in review.images"
            :key="idx"
            class="photo-thumb-wrap"
            @tap="previewReviewImage(idx)"
          >
            <RemoteImage class="photo-thumb" :src="imgUrl" mode="aspectFill" />
          </view>
        </view>

        <!-- 评价时间 -->
        <text class="review-time">评价时间：{{ formatTs(review.createdAt) }}</text>
      </view>

      <!-- 底部占位：有操作栏时避开按钮；完成后仍留出内容与屏幕底的间距 -->
      <view
        :class="[
          'bottom-spacer',
          hasBottomBar && order.status === 'ASSIGNED' && 'bottom-spacer--with-tip',
          !hasBottomBar && 'bottom-spacer--done',
        ]"
      />
    </scroll-view>

    <!-- ===== 底部固定按钮 ===== -->
    <block v-if="order">
      <!-- ASSIGNED（已派单）：只能接单，尚不可开始服务 -->
      <view v-if="order.status === 'ASSIGNED'" class="bottom-bar">
        <view class="bottom-tip-row">
          <text class="bottom-tip-text">请先接单，接单后方可开始服务</text>
        </view>
        <button
          class="start-btn start-btn--accept"
          :disabled="acceptingOrder"
          @tap="handleAcceptOrder"
        >
          <text class="start-btn-text">{{ acceptingOrder ? '接单中…' : '立即接单' }}</text>
        </button>
      </view>

      <!-- ACCEPTED（已接单）：可以开始服务 -->
      <view v-else-if="order.status === 'ACCEPTED'" class="bottom-bar">
        <button
          class="start-btn"
          :disabled="startingService"
          @tap="handleStartService"
        >
          <text class="start-btn-text">{{ startingService ? '定位中…' : '开始服务' }}</text>
        </button>
      </view>

      <!-- IN_SERVICE（服务中）：「完成服务」按钮（保洁 + 废品均显示） -->
      <view v-else-if="order.status === 'IN_SERVICE'" class="bottom-bar">
        <button
          class="start-btn"
          :disabled="completingService"
          @tap="handleCompleteService"
        >
          <text class="start-btn-text">{{ completingService ? '提交中…' : '完成服务' }}</text>
        </button>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { onLoad, onPageScroll } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { fetchOrderDetail, acceptOrder, gpsCheckin, completeOrder } from '@/api/order';
import type { OrderDetailDto } from '@/api/order';
import { uploadImage } from '@/api/upload';
import { fetchOrderReview } from '@/api/review';
import type { ReviewDto } from '@/api/review';
import { getOrderBadgeClass, getOrderBadgeLabel } from '@/constants/order-status';
import RemoteImage from '@/components/RemoteImage.vue';
import { previewNetworkImages } from '@/utils/remote-image';
import {
  formatRecyclingCarryFloorText,
  formatRecyclingElevatorText,
  formatRecyclingItemNames,
} from '@dayangyunjie/shared';

const authStore = useAuthStore();

const orderId = ref<number>(0);
const orderType = ref<'cleaning' | 'recycling'>('cleaning');
const order = ref<OrderDetailDto | null>(null);
const loading = ref(false);
const startingService = ref(false);
const acceptingOrder = ref(false);

// ===== IN_SERVICE 作业状态 =====
const beforePhotos = ref<string[]>([]);
const afterPhotos = ref<string[]>([]);
const uploadingBefore = ref(false);
const uploadingAfter = ref(false);
const completingService = ref(false);

// ===== REVIEWED 居民评价 =====
const review = ref<ReviewDto | null>(null);

const navDark = ref(false);
const heroThreshold = ref(80);
const navColor = computed(() => (navDark.value ? '#000000' : '#ffffff'));
const navBgColor = computed(() => (navDark.value ? '#ffffff' : 'transparent'));

const recyclingItemNames = computed(() =>
  orderType.value === 'recycling'
    ? formatRecyclingItemNames(order.value?.selectedItems, order.value?.serviceItem)
    : null,
);
const recyclingElevatorText = computed(() =>
  orderType.value === 'recycling' ? formatRecyclingElevatorText(order.value?.hasElevator) : null,
);
const recyclingCarryFloorText = computed(() =>
  orderType.value === 'recycling' ? formatRecyclingCarryFloorText(order.value?.carryFloor) : null,
);

// ===== 路由参数加载 =====
onLoad((query) => {
  orderId.value = Number(query?.orderId ?? 0);
  orderType.value = (query?.orderType as 'cleaning' | 'recycling') ?? 'cleaning';
  console.info('[task-detail] onLoad, orderId=', orderId.value, 'orderType=', orderType.value);
  loadDetail();
});

async function loadDetail(): Promise<void> {
  if (!orderId.value) return;
  loading.value = true;
  navDark.value = false;
  try {
    order.value = await fetchOrderDetail(orderType.value, orderId.value);
    console.info('[task-detail] loadDetail done, status=', order.value?.status);
    if (order.value?.status !== 'IN_SERVICE') {
      beforePhotos.value = [];
      afterPhotos.value = [];
    }
    if (order.value?.status === 'REVIEWED') {
      review.value = await fetchOrderReview(orderType.value, orderId.value);
    } else {
      review.value = null;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[task-detail] loadDetail failed, err=', msg);
  } finally {
    loading.value = false;
    if (order.value) {
      await nextTick();
      measureHero();
    }
  }
}

function measureHero() {
  uni.createSelectorQuery()
    .select('.hero')
    .boundingClientRect((rect) => {
      if (!rect) return;
      const sys = uni.getSystemInfoSync();
      const navH = (sys.statusBarHeight || 0) + 44;
      heroThreshold.value = Math.max(rect.height - navH, 40);
      console.info('[task-detail] hero threshold=', heroThreshold.value);
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

/**
 * 静默刷新（不触发 loading 遮罩）
 * 用于操作完成后直接更新 order 数据，保证时间轴等计算属性响应式更新
 */
async function refreshDetail(): Promise<void> {
  if (!orderId.value) return;
  try {
    const result = await fetchOrderDetail(orderType.value, orderId.value);
    order.value = result;
    if (result.status !== 'IN_SERVICE') {
      beforePhotos.value = [];
      afterPhotos.value = [];
    }
    if (result.status === 'REVIEWED') {
      review.value = await fetchOrderReview(orderType.value, orderId.value);
    } else {
      review.value = null;
    }
    console.info('[task-detail] refreshDetail done, status=', result.status);
  } catch (err: unknown) {
    console.info('[task-detail] refreshDetail failed, err=', err instanceof Error ? err.message : err);
  }
}

// ===== 计算属性 =====

/** 服务名称 */
const serviceName = computed<string>(() => {
  if (!order.value) return '';
  return order.value.serviceItem ?? order.value.serviceType ?? '服务任务';
});

/** 状态标签文字（工人端展示名） */
const statusTagLabel = computed<string>(() => {
  const s = order.value?.status ?? '';
  return getOrderBadgeLabel(s);
});

/** 状态标签样式（头图上统一半透明白底，class 预留扩展） */
const statusTagClass = computed<string>(() => {
  const s = order.value?.status ?? '';
  return getOrderBadgeClass(s);
});

/** 预计完成时间：从 appointDate + appointTimeSlot 拼装 */
const appointTimeText = computed<string>(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10);
  const slot = order.value.appointTimeSlot ?? '';
	return `${date} ${slot}`
});
// const appointTimeText = computed<string>(() => {
//   if (!order.value) return '';
//   const date = (order.value.appointDate ?? '').slice(0, 10);
//   const slot = order.value.appointTimeSlot ?? '';
//   const endTime = slot.includes('-') ? slot.split('-')[1]?.trim() : slot;
//   return endTime ? `${endTime}` : date;
// });
/** 计划服务时间（完整展示） */
const planServiceTime = computed<string>(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10).replace(/-/g, '-');
  const slot = order.value.appointTimeSlot ?? '';
  return `${date} ${slot}`;
});

/** 服务地址文字：省市区 + 详细地址 + 楼栋信息 */
const addressText = computed<string>(() => {
  const snap = order.value?.addressSnapshot;
  if (!snap) return '';
  return [snap.province, snap.city, snap.district, snap.detail, snap.buildingInfo]
    .filter(Boolean)
    .join('');
});

/**
 * 作业记录区展示模式
 * disabled  — ASSIGNED / ACCEPTED：灰色占位，点击 toast 引导去接单/开始服务
 * active    — IN_SERVICE：可上传编辑
 * readonly  — PENDING_REVIEW / REVIEWED：展示后端 workPhotos，不可修改
 */
const workAreaState = computed<'disabled' | 'active' | 'readonly'>(() => {
  const s = order.value?.status ?? '';
  if (s === 'ASSIGNED' || s === 'ACCEPTED') return 'disabled';
  if (s === 'IN_SERVICE') return 'active';
  return 'readonly';
});

const isWorkAreaDisabled = computed<boolean>(() => workAreaState.value === 'disabled');

/** 是否展示底部操作栏（固定定位会遮挡滚动内容） */
const hasBottomBar = computed<boolean>(() => {
  const s = order.value?.status ?? '';
  return s === 'ASSIGNED' || s === 'ACCEPTED' || s === 'IN_SERVICE';
});

/** 只读态：服务前照片（photoType === BEFORE） */
const beforeWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'BEFORE'),
);

/** 只读态：服务后照片（photoType === AFTER） */
const afterWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'AFTER'),
);

// ===== 时间轴节点 =====

/** 格式化时间戳 */
function formatTs(ts: string | undefined | null): string {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())}:${pad(beijing.getUTCSeconds())}`;
}

// ===== 评价 / 作业照片预览 =====

/** 预览服务前/后照片：先转成本地路径，避免体验版 downloadFile 拦截 http://IP */
function previewWorkPhotos(urls: string[], startIdx: number): void {
  if (!urls.length) return;
  void previewNetworkImages(urls, startIdx);
}

/** 预览评价图片 */
function previewReviewImage(startIdx: number): void {
  const urls = review.value?.images ?? [];
  if (!urls.length) return;
  void previewNetworkImages(urls, startIdx);
}

// ===== 操作函数 =====

/**
 * 立即接单（ASSIGNED → ACCEPTED）
 * 接单成功后刷新详情，底部按钮自动切换为「开始服务」
 */
async function handleAcceptOrder(): Promise<void> {
  if (acceptingOrder.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) {
    uni.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
    return;
  }
  acceptingOrder.value = true;
  console.info('[task-detail] handleAcceptOrder, orderId=', orderId.value);
  try {
    await acceptOrder(orderType.value, orderId.value, workerId);
    uni.showToast({ title: '接单成功', icon: 'success' });
    console.info('[task-detail] acceptOrder success');
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接单失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[task-detail] acceptOrder failed, err=', msg);
  } finally {
    acceptingOrder.value = false;
  }
}

/** 一键拨号 */
function handleCall(phone?: string | null): void {
  const target = (phone || order.value?.contactPhone || '').trim();
  if (!target) {
    uni.showToast({ title: '暂无联系电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({
    phoneNumber: target,
    complete(e) {
      console.info('[task-detail] makePhoneCall complete', e);
    },
  });
}

/** 复制服务地址到剪贴板 */
function handleCopyAddress(): void {
  const address = addressText.value.trim();
  if (!address) {
    uni.showToast({ title: '暂无服务地址', icon: 'none' });
    return;
  }
  uni.setClipboardData({
    data: address,
    success: () => {
      console.info('[task-detail] copy address success');
      uni.showToast({ title: '地址已复制', icon: 'success' });
    },
  });
}

/** 返回上一页 */
function onBack(): void {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/tasks/index' }) });
}

/**
 * 地图导航：
 * - 将完整服务地址复制到剪贴板，并弹窗提示员工在地图 App 中粘贴搜索导航
 * - WeChat miniapp 中 uni.openLocation 需要目的地经纬度，地址快照暂无坐标，
 *   采用复制地址方案作为通用替代
 */
function handleNavigate(): void {
  const address = addressText.value;
  if (!address) {
    uni.showToast({ title: '暂无服务地址', icon: 'none' });
    return;
  }
  console.info('[task-detail] handleNavigate, address=', address);
  uni.setClipboardData({
    data: address,
    success: () => {
      uni.showModal({
        title: '地址已复制',
        content: `${address}\n\n请打开地图 App 粘贴地址搜索导航`,
        confirmText: '知道了',
        showCancel: false,
      });
    },
  });
}

// ===== 作业照片操作 =====

/**
 * 开始服务前点击上传入口：灰显仍可点，toast 引导到底部按钮
 */
function handleDisabledPhotoTap(): void {
  const status = order.value?.status;
  const title =
    status === 'ASSIGNED'
      ? '请先接单，开始服务后可上传照片'
      : '请先点击底部「开始服务」，再上传照片';
  uni.showToast({ title, icon: 'none', duration: 2000 });
}

/**
 * 删除已上传的照片
 * @param slot  'before' | 'after'
 * @param index 要删除的索引
 */
function removePhoto(slot: 'before' | 'after', index: number): void {
  if (slot === 'before') {
    beforePhotos.value.splice(index, 1);
  } else {
    afterPhotos.value.splice(index, 1);
  }
}

/**
 * 拍照/选图并上传（支持批量多选）
 * 每个 slot 最多 9 张；并发上传所有选中图片，部分失败时保留成功项并提示失败数量
 */
function handleAddPhoto(slot: 'before' | 'after'): void {
  const list = slot === 'before' ? beforePhotos : afterPhotos;
  const remaining = 9 - list.value.length;
  if (remaining <= 0) return;
  if (slot === 'before' && uploadingBefore.value) return;
  if (slot === 'after' && uploadingAfter.value) return;

  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const filePaths = res.tempFilePaths;
      if (!filePaths || filePaths.length === 0) return;

      if (slot === 'before') uploadingBefore.value = true;
      else uploadingAfter.value = true;

      const orderNo = order.value?.orderNo;
      console.info('[task-detail] uploading photo, slot=', slot, 'before orderNo=', orderNo);

      // 并发上传所有选中图片，allSettled 保证部分失败不影响其他
      const results = await Promise.allSettled(
        filePaths.map((filePath) => uploadImage(filePath, orderNo)),
      );

      let failCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          list.value.push(result.value);
          console.info('[task-detail] photo uploaded, slot=', slot, 'url=', result.value);
        } else {
          failCount++;
          console.info('[task-detail] photo upload failed, slot=', slot, 'err=', result.reason);
        }
      }

      if (failCount > 0) {
        const successCount = filePaths.length - failCount;
        const msg = successCount > 0
          ? `${successCount} 张上传成功，${failCount} 张失败，请重试`
          : `上传失败，请重试`;
        uni.showToast({ title: msg, icon: 'none', duration: 2500 });
      }

      if (slot === 'before') uploadingBefore.value = false;
      else uploadingAfter.value = false;
    },
  });
}

/**
 * 完成服务：IN_SERVICE → PENDING_REVIEW
 * 校验服务前/后照片各至少 1 张 → 弹窗确认 → 调 /complete → 刷新详情
 */
async function handleCompleteService(): Promise<void> {
  if (completingService.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) {
    uni.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
    return;
  }

  if (beforePhotos.value.length === 0) {
    uni.showToast({ title: '请上传服务前照片', icon: 'none', duration: 2000 });
    return;
  }
  if (afterPhotos.value.length === 0) {
    uni.showToast({ title: '请上传服务后照片', icon: 'none', duration: 2000 });
    return;
  }

  uni.showModal({
    title: '确认完成服务',
    content: '确认已完成本次服务？',
    confirmText: '确认',
    cancelText: '取消',
    success: async (res) => {
      if (!res.confirm) return;

      completingService.value = true;
      console.info('[task-detail] handleCompleteService, orderId=', orderId.value, 'before=', beforePhotos.value.length, 'after=', afterPhotos.value.length);

      try {
        await completeOrder(orderType.value, orderId.value, beforePhotos.value, afterPhotos.value, workerId);
        console.info('[task-detail] completeOrder success');
        // 先静默刷新数据（时间轴/照片网格立即响应），再弹 toast
        await refreshDetail();
        uni.showToast({ title: '服务完成', icon: 'success' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '操作失败';
        uni.showToast({ title: msg, icon: 'none' });
        console.info('[task-detail] completeOrder failed, err=', msg);
      } finally {
        completingService.value = false;
      }
    },
  });
}

/**
 * 开始服务：
 * 1. 员工确认已到达客户地址附近
 * 2. 获取真实 GPS 位置
 * 3. GPS 签到（ACCEPTED→IN_SERVICE）
 */
async function handleStartService(): Promise<void> {
  if (startingService.value) return;
  const workerId = authStore.worker?.id;
  if (!workerId) {
    uni.showToast({ title: '登录状态异常，请重新登录', icon: 'none' });
    return;
  }

  uni.showModal({
    title: '开始服务确认',
    content: '请确认您已到达客户地址附近（建议200米以内）后再开始服务',
    confirmText: '确认',
    cancelText: '取消',
    success: (modalResult) => {
      if (!modalResult.confirm) return;

      startingService.value = true;
      console.info('[task-detail] handleStartService confirmed, orderId=', orderId.value);

      uni.getLocation({
        type: 'gcj02',
        success: async (locationResult) => {
          try {
            const checkinResult = await gpsCheckin(
              orderType.value,
              orderId.value,
              locationResult.latitude,
              locationResult.longitude,
              workerId,
            );

            console.info('[task-detail] gpsCheckin success, distance=', checkinResult.gpsDistance);
            await loadDetail();
            uni.showToast({ title: '已开始服务', icon: 'success' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '操作失败';
            uni.showToast({ title: msg, icon: 'none' });
            console.info('[task-detail] handleStartService failed, err=', msg);
          } finally {
            startingService.value = false;
          }
        },
        fail: (err) => {
          startingService.value = false;
          console.info('[task-detail] getLocation failed, err=', JSON.stringify(err));
          uni.showModal({
            title: '无法获取位置',
            content: '请授权位置权限后重试。',
            showCancel: false,
          });
        },
      });
    },
  });
}
</script>

<style scoped>
/* ===== 整体页面（对齐居民端详情） ===== */
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F8FAFF;
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

/* ===== 加载 ===== */
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
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* ===== 沉浸式头部 ===== */
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
  justify-content: space-between;
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
  padding: 0rpx 20rpx;
  height: 42rpx;
  min-width: 80rpx;
	border: 1rpx solid #FFF;
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

/* .hero-body .badge-blue,
.hero-body .badge-orange,
.hero-body .badge-green,
.hero-body .badge-grey {
  background: rgba(255, 255, 255, 0.25);
 }*/

.order-no {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
	margin-top: 10rpx;
  margin-bottom: 4rpx;
}

/* ===== 客户联系条（对齐居民端服务人员卡片） ===== */
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

.avatar-icon-img {
  width: 90rpx;
  height: 90rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.contact-phone {
  font-size: 24rpx;
  color: #58636A;
  letter-spacing: 2rpx;
}

.phone-call-icon {
  width: 60rpx;
  height: 60rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

/* ===== 信息卡 ===== */
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
  border-bottom: 1rpx solid #F7F9FA;
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
  border-bottom: 1rpx solid #EFEFEF;
}

/* 信息行：标签上、值下（对齐居民端） */
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
  color: #4C5760;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  line-height: 1.6;
}

.address-value {
  word-break: break-all;
}

.remark-value {
  word-break: break-all;
}

.divider {
  height: 1rpx;
  background: #f5f5f5;
  margin: 16rpx 0;
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

/* ===== 时间轴 ===== */
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

/* ===== 作业记录 ===== */
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

.photo-upload-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}

.photo-upload-wrap--disabled {
  opacity: 0.7;
}

.photo-upload-area {
  width: 160rpx;
  height: 160rpx;
  display: block;
  flex-shrink: 0;
}

.photo-disabled-tip {
  font-size: 20rpx;
  color: #bbb;
  text-align: center;
}

.bottom-spacer {
  height: 170rpx;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: content-box;
}

/* ASSIGNED 有提示文案，需要更高占位 */
.bottom-spacer--with-tip {
  height: 190rpx;
}

/* 完成后无底栏：内容与屏幕底留出间距 */
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
  box-shadow: none;
}

.bottom-tip-row {
  text-align: center;
  margin-bottom: 16rpx;
}

.bottom-tip-text {
  font-size: 24rpx;
  color: #fa8c16;
}

.start-btn {
  width: 100%;
  height: 88rpx;
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
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

.start-btn[disabled] {
  opacity: 0.5;
}

.start-btn--accept {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
}

.start-btn--accept[disabled] {
  opacity: 0.5;
}

.start-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}

.photo-empty-tip {
  padding: 16rpx 0 8rpx;
}

.photo-count-tip {
  font-size: 22rpx;
  color: #aaa;
  margin-left: auto;
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

.photo-delete-btn {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-delete-icon {
  font-size: 20rpx;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

.photo-add-btn {
  width: 160rpx;
  height: 160rpx;
  border: none;
  border-radius: 12rpx;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
}

.photo-add-btn--loading {
  opacity: 0.6;
  pointer-events: none;
}

.photo-uploading-icon {
  font-size: 40rpx;
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
  color: #FF7804;
}

.review-star--empty {
  color: #e0e0e0;
}

.review-rating-text {
  font-size: 26rpx;
  color: #FF7804;
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
  color: #0B7CC8;
  background: #F0F6FF;
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
