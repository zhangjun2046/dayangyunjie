<template>
  <view class="page">
    <!-- 加载中 / 失败：保留可返回的导航 -->
    <template v-if="loading || !order">
      <uni-nav-bar
        status-bar
        title="订单详情"
        left-icon="left"
        :border="false"
        @clickLeft="onBack"
      />
      <view class="loading-wrap">
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
            <view class="status-item-name">{{ order.serviceItem }}</view>
            <view class="order-no">订单编号：{{ order.orderNo }}</view>
            <view v-if="orderType !== 'consult'" class="order-no">服务时间：{{ appointTimeText }}</view>
          </view>
          <view class="status-badge">
            <text class="badge-text">{{ getOrderBadgeLabel(order.status, orderType) }}</text>
          </view>
        </view>
      </view>
			
			<!-- 服务人员（仅保洁/废品，且有 workerId 时展示） -->
			<view v-if="orderType !== 'consult'" class="info-card">
			  <!-- <view class="card-title-row">
			    <text class="card-title">服务人员</text>
			  </view> -->
			  <!-- 已分配服务人员 -->
			  <template v-if="order.worker">
					<view class="service-row">
						<view class="worker-main">
							<image
								class="worker-avatar"
								:src="getWorkerAvatar(order.worker.gender)"
								mode="aspectFit"
							/>
							<view class="worker-meta">
								<text class="worker-name">{{ order.worker.name }}</text>
								<view class="worker-stats">
									<image class="worker-star" src="/static/icons/star-lit.png" mode="aspectFit" />
									<text class="worker-rating">{{ (order.worker.rating ?? 5).toFixed(1) }}</text>
									<text class="worker-total">已服务{{ order.worker.totalOrders ?? 0 }}单</text>
								</view>
							</view>
						</view>
						<image class="worker-phone" src="/static/icons/icon_dianhua_n.png" mode="aspectFit" @click="onPhoneService(order.worker.phone)" />
					</view>
			    <!-- <view class="info-row">
			      <text class="info-label">联系电话</text>
			      <text class="info-value">{{ order.worker.phone }}</text>
			    </view> -->
			  </template>
			  <!-- 待分配占位 -->
			  <view v-else class="worker-placeholder">
			    <text class="placeholder-text">等待平台为您分配服务人员</text>
			  </view>
			</view>
			
      <!-- 服务信息卡片 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">订单信息</text>
        </view>
        <!-- 保洁/废品订单信息 -->
        <template v-if="orderType !== 'consult'">
          <view class="info-row">
            <text class="info-label">服务类型</text>
            <text class="info-value">{{ getServiceName() }}</text>
          </view>
					<view class="info-row">
					  <text class="info-label">联系人姓名</text>
					  <text class="info-value">{{ (order as CleaningOrderDto).contactName }}</text>
					</view>
					<view class="info-row">
					  <text class="info-label">联系人电话</text>
					  <text class="info-value">{{ (order as CleaningOrderDto).contactPhone }}</text>
					</view>
					
					<view class="info-row">
					  <text class="info-label">是否代客下单</text>
						<view class="proxy-label" v-if="order.isProxyOrder">
						  <text class="proxy-tag-text">代下单</text>
						</view>
					  <text v-else class="info-value">否</text>
					</view>
					<template v-if="order.isProxyOrder">
					  <!-- <view class="divider" /> -->
					  <!-- <view class="proxy-label">
					    <text class="proxy-tag-text">代下单</text>
					  </view> -->
					  <view class="info-row">
					    <text class="info-label">被服务人姓名</text>
					    <text class="info-value">{{ order.serviceContactName || '未填写' }}</text>
					  </view>
					  <view class="info-row">
					    <text class="info-label">被服务人电话</text>
					    <text class="info-value">{{ order.serviceContactPhone || '未填写' }}</text>
					  </view>
					</template>
					
          <view v-if="orderType === 'cleaning'" class="info-row">
            <text class="info-label">预计服务时长</text>
            <text class="info-value">{{ (order as CleaningOrderDto).serviceDuration }}小时</text>
          </view>
          <view v-if="orderType === 'recycling'" class="info-row">
            <text class="info-label">预估重量</text>
            <text class="info-value">{{ (order as RecyclingOrderDto).estimatedWeight }}kg</text>
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
            <text class="info-label">预约时间</text>
            <text class="info-value">{{ formatDate((order as CleaningOrderDto | RecyclingOrderDto).appointDate) }} {{ (order as CleaningOrderDto | RecyclingOrderDto).appointTimeSlot }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">服务地址</text>
            <text class="info-value address-value">{{ getAddressText() }}</text>
          </view>
					<view class="info-row" v-if="order.remark">
					  <text class="info-label">备注</text>
					  <text class="info-value">{{ (order as RecyclingOrderDto).remark }}</text>
					</view>
          <view v-if="recyclingItemPhotoUrl" class="info-row info-row-photo">
            <text class="info-label">物品照片</text>
            <RemoteImage
              class="item-photo-thumb"
              :src="recyclingItemPhotoUrl"
              mode="aspectFill"
              variant="thumbnail"
              @tap="onPreviewItemPhoto"
            />
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
					<view class="info-row">
					  <text class="info-label">服务类型</text>
					  <text class="info-value">{{ getServiceName() }}</text>
					</view>
					<view class="info-row">
					  <text class="info-label">联系人姓名</text>
					  <text class="info-value">{{ (order as CleaningOrderDto).contactName }}</text>
					</view>
					<view class="info-row">
					  <text class="info-label">联系人电话</text>
					  <text class="info-value">{{ (order as CleaningOrderDto).contactPhone }}</text>
					</view>
					
					<view class="info-row">
					  <text class="info-label">是否代客下单</text>
						<view class="proxy-label" v-if="order.isProxyOrder">
						  <text class="proxy-tag-text">代下单</text>
						</view>
					  <text v-else class="info-value">否</text>
					</view>
					<template v-if="order.isProxyOrder">
					  <!-- <view class="divider" /> -->
					  <!-- <view class="proxy-label">
					    <text class="proxy-tag-text">代下单</text>
					  </view> -->
					  <view class="info-row">
					    <text class="info-label">被服务人姓名</text>
					    <text class="info-value">{{ order.serviceContactName || '未填写' }}</text>
					  </view>
					  <view class="info-row">
					    <text class="info-label">被服务人电话</text>
					    <text class="info-value">{{ order.serviceContactPhone || '未填写' }}</text>
					  </view>
					</template>
					
        </template>
      </view>

      <!-- 联系人信息 -->
      <!-- <view class="info-card">
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
        </view> -->

        <!-- 代下单：被服务人 -->
      <!-- </view> -->

      <!-- 服务进度时间轴（保洁/废品） -->
      <view v-if="orderType !== 'consult'" class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务进度</text>
        </view>
        <OrderStatusTimeline
          :progress="order.progress ?? []"
        />
      </view>

      <!-- 家政咨询进度时间轴 -->
      <view v-else class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务进度</text>
        </view>
        <OrderStatusTimeline :progress="order.progress ?? []" />
      </view>

      <!-- 服务记录照片（服务前/服务后，员工端完成服务后上传） -->
      <view v-if="orderType !== 'consult' && (beforeWorkPhotos.length || afterWorkPhotos.length)" class="info-card">
        <view class="card-title-row">
          <text class="card-title">服务记录</text>
        </view>
        <view v-if="beforeWorkPhotos.length" class="photo-group">
          <text class="photo-group-label">服务前照片</text>
          <view class="photo-grid">
            <RemoteImage
              v-for="(photo, idx) in beforeWorkPhotos"
              :key="photo.id"
              class="work-photo-img"
              :src="photo.url"
              mode="aspectFill"
              variant="thumbnail"
              @tap="onPreviewWorkPhoto(beforeWorkPhotos, idx)"
            />
          </view>
        </view>
        <view v-if="afterWorkPhotos.length" class="photo-group">
          <text class="photo-group-label">服务后照片</text>
          <view class="photo-grid">
            <RemoteImage
              v-for="(photo, idx) in afterWorkPhotos"
              :key="photo.id"
              class="work-photo-img"
              :src="photo.url"
              mode="aspectFill"
              variant="thumbnail"
              @tap="onPreviewWorkPhoto(afterWorkPhotos, idx)"
            />
          </view>
        </view>
      </view>

      <!-- 我的评价（订单已完成时展示） -->
      <view v-if="review && orderType !== 'consult'" class="info-card review-card">
        <view class="card-title-row review-card-header">
          <text class="card-title">我的评价</text>
          <!-- <text class="review-date-text">{{ formatDate(review.createdAt) }}</text> -->
        </view>
        <!-- 星级：点亮用 PNG，未点亮用 uni-icons -->
        <view class="review-stars-row">
          <view v-for="n in 5" :key="n" class="review-star">
            <image
              v-if="n <= review.rating"
              class="review-star-img"
              src="/static/icons/star-lit.png"
              mode="aspectFit"
            />
						<image
						  v-else
						  class="review-star-img"
						  src="/static/icons/star-lit_n.png"
						  mode="aspectFit"
						/>
            <!-- <uni-icons
              v-else
              type="star-filled"
              :size="22"
              color="#e0e0e0"
            /> -->
          </view>
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
          <RemoteImage
            v-for="(img, idx) in review.images"
            :key="idx"
            class="review-img"
            :src="img"
            mode="aspectFill"
            variant="thumbnail"
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
            {{ formatComplaintReasons(complaint.reasons) }}
          </text>
        </view>
        <view class="complaint-view-more">
          <text class="view-more-text">查看投诉进度 ›</text>
        </view>
      </view>

      <!-- 备注 -->
      <!-- <view v-if="order.remark" class="info-card">
        <view class="card-title-row">
          <text class="card-title">备注</text>
        </view>
        <text class="remark-text">{{ order.remark }}</text>
      </view> -->

      <!-- 底部操作区占位（真实按钮在底部固定区） -->
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="order && hasActionButton" class="action-bar">
      <!-- 待派单：取消订单 -->
      <button
        v-if="canCancel"
        class="btn-cancel"
        @tap="onCancelOrder"
        :disabled="actionLoading"
      >
        {{ actionLoading ? '处理中…' : '取消订单' }}
      </button>

      <!-- ACCEPTED 及以后（保洁/废品）：投诉反馈 + 联系客服 + 可选评价 -->
      <template v-if="canComplaint">
        <button v-if="!complaint" class="btn-soft" @tap="onGoComplaint">投诉反馈</button>
        <button class="btn-soft" @tap="onCallService">联系客服</button>
      </template>

      <!-- 待评价（7天内）：评价服务 -->
      <button
        v-if="canReview"
        class="btn-review"
        @tap="onGoReview"
      >
        评价服务
      </button>
    </view>

    <ContactOperatorPicker ref="contactPickerRef" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { onLoad, onShow, onPageScroll } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchCleaningOrderDetail,
  cancelCleaningOrder,
  type CleaningOrderDto,
  type WorkPhotoDto,
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
  formatComplaintReasons,
  type ComplaintDto,
} from '@/api/complaint';
import { fetchReviewByOrder, type ReviewDto } from '@/api/review';
import OrderStatusTimeline from '@/components/OrderStatusTimeline.vue';
import ContactOperatorPicker from '@/components/ContactOperatorPicker.vue';
import RemoteImage from '@/components/RemoteImage.vue';
import { callContactOperator } from '@/utils/call-contact-operator';
import { previewNetworkImages } from '@/utils/remote-image';
import {
  formatRecyclingCarryFloorText,
  formatRecyclingElevatorText,
  formatRecyclingItemNames,
  type ProgressNodeDto,
} from '@dayangyunjie/shared';
import {
  canCancelOrder,
  canComplaintOrder,
  canReviewOrder,
  getOrderBadgeLabel,
} from '@/constants/order-status';

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
  worker?: {
    id: number;
    name: string;
    phone: string;
    gender?: string | null;
    rating?: number;
    totalOrders?: number;
  } | null;
  workPhotos?: WorkPhotoDto[];
  progress?: ProgressNodeDto[];
};

const authStore = useAuthStore();
const loading = ref(true);
const actionLoading = ref(false);
const contactPickerRef = ref<InstanceType<typeof ContactOperatorPicker> | null>(null);
const order = ref<AnyOrder | null>(null);
const orderType = ref<OrderType>('cleaning');
const orderId = ref<number>(0);
const complaint = ref<ComplaintDto | null>(null);
const review = ref<ReviewDto | null>(null);

const navDark = ref(false);
const heroThreshold = ref(80);
const navColor = computed(() => (navDark.value ? '#000000' : '#ffffff'));
const navBgColor = computed(() => (navDark.value ? '#ffffff' : 'transparent'));

const recyclingSnapshot = computed(() => {
  if (orderType.value !== 'recycling' || !order.value) return null;
  return order.value as RecyclingOrderDto;
});
const recyclingItemNames = computed(() =>
  formatRecyclingItemNames(
    recyclingSnapshot.value?.selectedItems,
    recyclingSnapshot.value?.serviceItem,
  ),
);
const recyclingElevatorText = computed(() =>
  formatRecyclingElevatorText(recyclingSnapshot.value?.hasElevator),
);
const recyclingCarryFloorText = computed(() =>
  formatRecyclingCarryFloorText(recyclingSnapshot.value?.carryFloor),
);
const recyclingItemPhotoUrl = computed(() => recyclingSnapshot.value?.itemPhotoUrl?.trim() || '');

/** 服务人员头像：女 icon_photo_n，男 icon_photo_p；未知性别沿用默认头像 */
function getWorkerAvatar(gender?: string | null): string {
  return gender === 'MALE'
    ? '/static/icons/icon_photo_p.png'
    : '/static/icons/icon_photo_n.png';
}

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

// 从评价页/投诉页返回时刷新订单、投诉与评价数据
onShow(() => {
  if (!orderId.value) return;
  console.info(`[order-detail] onShow → reload orderId=${orderId.value}`);
  loadDetail();
  loadComplaint();
  if (orderType.value !== 'consult') {
    loadReview();
  }
});

async function loadDetail() {
  loading.value = true;
  navDark.value = false;
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
      console.info('[order-detail] hero threshold=', heroThreshold.value);
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
  void previewNetworkImages(review.value.images as string[], startIdx);
}

/** 服务前照片（员工端完成服务时上传） */
const beforeWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'BEFORE'),
);

/** 服务后照片（员工端完成服务时上传） */
const afterWorkPhotos = computed(() =>
  (order.value?.workPhotos ?? []).filter((p) => p.photoType === 'AFTER'),
);

const appointTimeText = computed<string>(() => {
  if (!order.value) return '';
  const date = (order.value.appointDate ?? '').slice(0, 10);
  const slot = order.value.appointTimeSlot ?? '';
	return `${date} ${slot}`
  // 取 timeSlot 中的结束时间（如 "14:00-17:00" → "17:00"）
  // const endTime = slot.includes('-') ? slot.split('-')[1]?.trim() : slot;
  // return endTime ? `${endTime}` : date;
});

/** 预览服务记录照片 */
function onPreviewWorkPhoto(photos: WorkPhotoDto[], startIdx: number) {
  if (!photos.length) return;
  void previewNetworkImages(photos.map((p) => p.url), startIdx);
  console.info('[order-detail] preview work photo, count=', photos.length);
}

function onPreviewItemPhoto() {
  if (!recyclingItemPhotoUrl.value) return;
  void previewNetworkImages([recyclingItemPhotoUrl.value], 0);
}

/** 跳转投诉进度详情页 */
function onViewComplaintDetail() {
  if (!complaint.value) return;
  uni.navigateTo({ url: `/pages/complaint-detail/index?complaintId=${complaint.value.id}` });
  console.info(`[order-detail] view complaint detail id=${complaint.value.id}`);
}

function onPhoneService(phone: string) {
  uni.makePhoneCall({
    phoneNumber: phone,
    complete(e) {
      console.info('[order-detail] makePhoneCall complete', e);
    },
  });
}

/** 是否有底部操作按钮 */
const hasActionButton = computed(() => {
  if (!order.value) return false;
  if (canCancel.value) return true;
  if (canReview.value) return true;
  if (canComplaint.value) return true;
  return false;
});

/** 是否可以取消（仅待派单的保洁/废品订单） */
const canCancel = computed(() => {
  if (!order.value) return false;
  return canCancelOrder(order.value.status, orderType.value);
});

/** 是否可以评价（PENDING_REVIEW + 7天内）仅保洁/废品 */
const canReview = computed(() => {
  if (!order.value) return false;
  if (!canReviewOrder(order.value.status, orderType.value)) return false;
  const updated = (order.value as CleaningOrderDto).updatedAt || order.value.createdAt;
  if (!updated) return true;
  const diff = Date.now() - new Date(updated).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
});

/** 是否可以投诉（ACCEPTED 及之后状态，仅保洁/废品） */
const canComplaint = computed(() => {
  if (!order.value) return false;
  return canComplaintOrder(order.value.status, orderType.value);
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

/** 联系客服：与首页 / 我的一致，取运营人员「接单」电话 */
function onCallService() {
  void callContactOperator(contactPickerRef.value);
  console.info('[order-detail] call contact operator');
}

/** 返回上一页 */
function onBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/orders/index' }) });
}

function getServiceName(): string {
  if (orderType.value === 'cleaning') return (order.value as CleaningOrderDto).serviceItem || '';
  if (orderType.value === 'recycling') return (order.value as RecyclingOrderDto).serviceItem || '';
  return '';
}

function getAddressText(): string {
  const snapshot = (order.value as CleaningOrderDto).addressSnapshot as Record<string, unknown> | null | undefined;
  if (!snapshot) return '未设置';
  const text = [snapshot.province, snapshot.city, snapshot.district, snapshot.detail, snapshot.buildingInfo]
    .filter(Boolean)
    .join('');
  return text || '未设置';
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
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
  background: #F8FAFF;
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
  height: 0;
}

.nav-layer.is-dark :deep(.uni-nav-bar-text),
.nav-layer.is-dark :deep(.uni-icons) {
  color: #000000 !important;
}

/* 沉浸式头部 */
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

.status-item-name {
  color: #fff;
  font-size: 36rpx;
  font-weight: bold;
}

.status-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  margin-right: 16rpx;
}

/* .status-badge {
  padding: 8rpx 20rpx;
  height: 50rpx;
  min-width: 80rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
} */

.status-badge {
	margin-top: 30rpx;
  padding: 0rpx 20rpx;
  height: 50rpx;
  min-width: 80rpx;
	border: 1rpx solid #FFF;
  border-radius: 25rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-text {
  font-size: 28rpx;
  color: #ffffff;
}

.order-no {
  font-size: 28rpx;
	margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.7);
}

.status-tip {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* 信息卡片 */
.info-card {
  background: #ffffff;
  margin: 20rpx 24rpx;
  padding: 28rpx 32rpx;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0rpx 4rpx 20rpx 0rpx rgba(0,0,0,0.05);
}

/* 第一张卡片圆角；不再抬 z-index，避免滚动时盖住导航栏 */
.hero + .info-card {
  border-radius: 32rpx;
}

.card-title-row {
  margin-bottom: 20rpx;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #EFEFEF;
}

.card-title {
  font-size:32rpx;
  font-weight: bold;
  color: #333333;
}

.service-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.worker-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.worker-avatar {
  width: 90rpx;
  height: 90rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.worker-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.worker-name {
  color: #222222;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.35;
}

.worker-stats {
  display: flex;
  align-items: center;
  margin-top: 6rpx;
}

.worker-star {
  width: 28rpx;
  height: 28rpx;
  margin-right: 6rpx;
  flex-shrink: 0;
}

.worker-rating,
.worker-total {
  color: #59636d;
  font-size: 26rpx;
  line-height: 1.4;
}

.worker-total {
  margin-left: 14rpx;
}

.worker-phone {
  width: 60rpx;
  height: 60rpx;
  margin-left: 20rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.info-row {
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  margin-bottom: 16rpx;
}

.info-label {
  font-size: 30rpx;
  color: #4C5760;
  flex-shrink: 0;
  line-height: 1.6;
}

.info-value {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.6;
}

.address-value {
  display: block;
  width: 100%;
  white-space: normal;
  word-break: break-all;
  word-wrap: break-word;
  overflow: visible;
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
  height: 240rpx;
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
  align-items: center;
  gap: 20rpx;
}

.btn-soft {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  border: none;
  line-height: 88rpx;
  background: #f0f6ff;
  color: #333333;
}

.btn-soft::after {
  border: none;
}

.btn-review {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  text-align: center;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  color: #ffffff;
  border: none;
}

.btn-review::after {
  border: none;
}

.btn-primary {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
  line-height: 88rpx;
	background: #1677ff;
	color: #ffffff;
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  border: none;
  line-height: 88rpx;
  background: #f0f6ff;
  color: #333333;
}

.btn-cancel::after {
  border: none;
}

/* .btn-primary {
  background: #1677ff;
  color: #ffffff;
} */

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
.btn-soft[disabled],
.btn-review[disabled],
.btn-primary[disabled] {
  opacity: 0.6;
}

/* 头部 badge 统一半透明白底 */
.hero-body .badge-blue,
.hero-body .badge-orange,
.hero-body .badge-green,
.hero-body .badge-grey {
  background: rgba(255, 255, 255, 0.25);
}

/* 投诉进度卡片 */
.complaint-card {
  /* border-left: 6rpx solid #fa8c16; */
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
  /* border-left: 6rpx solid #52c41a; */
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
  margin-bottom: 20rpx;
}

.review-star {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.review-star-img {
  width: 34rpx;
  height: 34rpx;
	margin-right: 4rpx;
}

.review-rating-label {
  font-size: 26rpx;
  color: #FF7804;
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
  background: #F0F6FF;
  /* border: 1rpx solid #b7eb8f; */
}

.review-tag-text {
  font-size: 24rpx;
  color: #0B7CC8;
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

/* 服务记录照片（服务前/服务后） */
.photo-group {
  margin-bottom: 40rpx;
	
}

.photo-group:last-child {
  margin-bottom: 0;
}

.photo-group-label {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.photo-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
	padding-top: 5rpx;
}

.work-photo-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.item-photo-thumb {
  margin-top: 8rpx;
}
</style>
