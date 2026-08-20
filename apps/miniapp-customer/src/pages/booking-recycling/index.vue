<template>
  <view class="booking-page">
    <!-- 步骤条 -->
    <view class="stepper">
      <view
        v-for="(label, idx) in STEP_LABELS"
        :key="idx"
        class="step-item"
      >
        <view class="step-circle" :class="{ active: store.step > idx, current: store.step === idx + 1 }">
					<text class="step-num" :class="{ active: store.step > idx, current: store.step === idx + 1 }">{{ idx + 1 }}</text>
        </view>
        <text class="step-label" :class="{ active: store.step >= idx + 1 }">{{ label }}</text>
        <view v-if="idx < STEP_LABELS.length - 1" class="step-line" :class="{ active: store.step > idx + 1 }" />
      </view>
    </view>

    <!-- ===================== STEP 1: 选择服务 ===================== -->
    <scroll-view v-if="store.step === 1" scroll-y class="scroll-area">
      <view class="section-wrap-1">
        <view v-if="catalogLoading" class="loading-tip">
          <text>加载中...</text>
        </view>

        <!-- 服务类型卡片 -->
        <view
          v-for="item in catalogs"
          :key="item.id"
          class="service-card"
          :class="{ selected: store.selectedCatalog?.id === item.id }"
          @tap="selectCatalog(item)"
        >
          <view class="card-left">
            <view class="card-icon-wrap">
              <image
                v-if="itemIconSrc(item)"
                class="card-icon-img"
                :src="itemIconSrc(item)!"
                mode="aspectFit"
                @error="onItemIconError(item)"
              />
              <text v-else class="card-icon">{{ itemFallbackEmoji(item) }}</text>
            </view>
            <view class="card-text">
              <text class="card-name">{{ item.name }}</text>
              <text class="card-subtitle">{{ item.subtitle }}</text>
            </view>
          </view>
          <view v-if="store.selectedCatalog?.id === item.id" class="card-check">
            <text class="check-icon">✓</text>
          </view>
        </view>

        <view v-if="!catalogLoading && catalogs.length === 0" class="empty-tip">
          <text>暂无可用服务类型</text>
        </view>
      </view>

      <!-- 大件搬运提示（仅大件类显示） -->
      <view v-if="isLargeItem" class="hint-row">
        <text class="hint-text">① 需搬运工上门，请确保保电梯可用</text>
      </view>

      <!-- 预估重量步进器 -->
      <view class="weight-row">
        <text class="weight-label">预估重量（kg）</text>
        <view class="stepper-ctrl">
          <view
            class="ctrl-btn-1"
            :class="{ disabled: store.estimatedWeight <= 5 }"
            @tap="changeWeight(-5)"
          >
            <text>-</text>
          </view>
          <view class="ctrl-val">
            <text class="val-num">{{ store.estimatedWeight }}</text>
            <text class="val-unit">kg</text>
          </view>
          <view class="ctrl-btn" @tap="changeWeight(5)">
            <text class="ctrl-text">+</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ===================== STEP 2: 预约时间 ===================== -->
    <scroll-view v-if="store.step === 2" scroll-y class="scroll-area">
      <!-- 日历 -->
      <view class="calendar-wrap">
        <view class="cal-header">
          <view class="cal-nav" @tap="changeMonth(-1)"><text class="nav-arrow">‹ 上个月</text></view>
          <text class="cal-title">{{ calYear }} 年 {{ calMonth }} 月</text>
          <view class="cal-nav" @tap="changeMonth(1)"><text class="nav-arrow">下个月 ›</text></view>
        </view>
        <view class="cal-weekdays">
          <text v-for="w in WEEKDAYS" :key="w" class="weekday">{{ w }}</text>
        </view>
        <view class="cal-grid">
          <view
            v-for="(cell, idx) in calCells"
            :key="idx"
            class="cal-cell"
            :class="{
              empty: !cell.day,
              disabled: cell.disabled,
              today: cell.isToday,
              selected: cell.dateStr === store.selectedDate,
            }"
            @tap="cell.day && !cell.disabled ? selectDate(cell) : null"
          >
            <text v-if="cell.day" class="cell-day">{{ cell.day }}</text>
            <text v-if="cell.day" class="cell-lunar">{{ cell.lunar }}</text>
          </view>
        </view>
      </view>

      <!-- 时段选择 -->
      <view class="section-wrap">
        <text class="sub-title">选择时段</text>
        <view class="time-grid">
          <view
            v-for="t in TIME_SLOTS"
            :key="t"
            class="time-btn"
            :class="{ selected: store.selectedTime === t }"
            @tap="store.selectedTime = t"
          >
            <text>{{ t }}</text>
          </view>
        </view>
      </view>

      <!-- 服务地址 -->
      <view class="section-wrap" @tap="goAddressSelect">
        <text class="sub-title">服务地址</text>
        <view v-if="store.selectedAddress" class="addr-row">
          <view class="addr-main">
            <view class="addr-top">
              <view v-if="store.selectedAddress.isDefault" class="addr-badge">默认</view>
              <text class="addr-district">{{ store.selectedAddress.province }} {{ store.selectedAddress.city }} {{ store.selectedAddress.district }}</text>
            </view>
            <text class="addr-detail">{{ store.selectedAddress.detail }}</text>
            <text class="addr-contact">{{ store.selectedAddress.contactName }} {{ maskPhone(store.selectedAddress.contactPhone) }}</text>
          </view>
          <text class="addr-arrow">›</text>
        </view>
        <view v-else class="addr-empty">
          <text class="addr-empty-text">暂无地址，点击添加 ›</text>
        </view>
      </view>

      <!-- 代家人下单 -->
      <view class="section-wrap proxy-section">
        <text class="sub-title">是否为代家人下单</text>
        <view class="radio-group">
          <view class="radio-item" @tap="store.isProxy = true">
            <image class="radio-icon" :src="store.isProxy ? '/static/icons/radio-checked.png' : '/static/icons/radio-unchecked.png'" mode="aspectFit" />
            <text class="radio-label">是</text>
          </view>
          <view class="radio-item" @tap="store.isProxy = false">
            <image class="radio-icon" :src="!store.isProxy ? '/static/icons/radio-checked.png' : '/static/icons/radio-unchecked.png'" mode="aspectFit" />
            <text class="radio-label">否</text>
          </view>
        </view>
      </view>

      <!-- 代下单信息（选择"是"时即时展开） -->
      <view v-if="store.isProxy" class="section-wrap">
        <text class="sub-title">服务对象信息</text>
        <view class="input-card">
          <view class="input-row">
            <text class="input-label">姓名</text>
            <input
              class="input-field"
              placeholder="请输入服务对象姓名"
              placeholder-style="color:#999;font-size:30rpx;"
              :value="store.serviceContactName"
              @input="store.serviceContactName = $event.detail.value"
            />
          </view>
          <view class="input-row">
            <text class="input-label">手机号</text>
            <input
              class="input-field"
              type="number"
              maxlength="11"
              placeholder="请输入服务对象手机号"
              placeholder-style="color:#999;font-size:30rpx;"
              :value="store.serviceContactPhone"
              @input="store.serviceContactPhone = $event.detail.value"
            />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ===================== STEP 3: 确认订单 ===================== -->
    <scroll-view v-if="store.step === 3" scroll-y class="scroll-area">
      <!-- 订单详情卡 -->
      <view class="section-wrap">
        <text class="sub-title">订单详情</text>
        <view class="order-card">
          <view class="order-row">
            <text class="order-key">回收类型</text>
            <text class="order-val">{{ store.selectedCatalog?.name ?? '-' }}</text>
          </view>
          <view class="order-row">
            <text class="order-key">预估重量</text>
            <text class="order-val">{{ store.estimatedWeight }}kg</text>
          </view>
          <view class="order-row">
            <text class="order-key">预约时间</text>
            <text class="order-val">{{ appointTimeDisplay }}</text>
          </view>
          <view class="order-row">
            <text class="order-key">预约地址</text>
            <text class="order-val">{{ appointAddrDisplay }}</text>
          </view>
        </view>
      </view>

      <!-- 代下单信息（仅 isProxy 时显示） -->
      <view v-if="store.isProxy" class="section-wrap">
        <text class="sub-title">服务对象信息</text>
        <view class="input-card">
          <view class="input-row">
            <text class="input-label">姓名</text>
            <input
              class="input-field"
              placeholder="请输入服务对象姓名"
              :value="store.serviceContactName"
              @input="store.serviceContactName = $event.detail.value"
            />
          </view>
          <view class="input-row">
            <text class="input-label">手机号</text>
            <input
              class="input-field"
              type="number"
              maxlength="11"
              placeholder="请输入服务对象手机号"
              :value="store.serviceContactPhone"
              @input="store.serviceContactPhone = $event.detail.value"
            />
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section-wrap">
        <text class="sub-title">备注</text>
        <view class="remark-wrap">
          <textarea
            class="remark-area"
            placeholder="请填写具体回收物品描述，如：有三捆旧报纸、一台旧电视..."
            :value="store.remark"
            @input="store.remark = $event.detail.value"
            maxlength="200"
          />
        </view>
      </view>

      <!-- 服务须知 -->
      <view class="notice-wrap">
        <text class="notice-title-text">服务须知</text>
        <text v-for="(n, i) in SERVICE_NOTICES" :key="i" class="notice-item-text">{{ n }}</text>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view v-if="store.step > 1" class="back-btn" @tap="prevStep">
        <text class="back-text">上一步</text>
      </view>
      <view
        class="next-btn"
        :class="{ loading: submitting }"
        @tap="store.step < 3 ? nextStep() : submitOrder()"
      >
        <text class="next-text">{{ store.step === 3 ? '确定预约' : '下一步' }}</text>
      </view>
    </view>

    <!-- 预约成功提示卡 -->
    <BookingSuccessOverlay ref="successOverlayRef" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useBookingRecyclingStore } from '@/store/booking-recycling';
import { useAuthStore } from '@/store/auth';
import { fetchRecyclingCatalogs, type ServiceCatalogDto } from '@/api/service-catalog';
import { fetchAddresses } from '@/api/address';
import { createRecyclingOrder } from '@/api/recycling-order';
import { getSolarToLunar } from '@/utils/lunar';
import {
  resolveServiceCatalogIcon,
  serviceCatalogFallbackEmoji,
} from '@/utils/service-catalog-icon';
import BookingSuccessOverlay from '@/components/BookingSuccessOverlay.vue';

const store = useBookingRecyclingStore();
const authStore = useAuthStore();
const successOverlayRef = ref<InstanceType<typeof BookingSuccessOverlay> | null>(null);

// ───────────────────── 常量 ─────────────────────
const STEP_LABELS = ['选择服务', '预约时间', '确认订单'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const SERVICE_NOTICES = [
  '回收员上门前会电话确认',
  '大件类需搬运工上门，请确保电梯可用',
  '请合理估算重量，以便确认搬运工具',
  '危险废品、医疗废物等特殊品类不纳入回收范围',
];

// ───────────────────── Step 1 ─────────────────────
const catalogs = ref<ServiceCatalogDto[]>([]);
const catalogLoading = ref(false);
const failedRemoteIconIds = ref<Set<number>>(new Set());

const isLargeItem = computed(() =>
  store.selectedCatalog?.name?.includes('大件') ?? false,
);

/** 后台图标优先，加载失败或未配置时回退现有本地图标。 */
function itemIconSrc(item: ServiceCatalogDto): string | null {
  return resolveServiceCatalogIcon(
    item,
    'RECYCLING',
    failedRemoteIconIds.value.has(item.id),
  );
}

function itemFallbackEmoji(item: ServiceCatalogDto): string {
  return serviceCatalogFallbackEmoji(item, 'RECYCLING');
}

function onItemIconError(item: ServiceCatalogDto) {
  if (!item.icon || failedRemoteIconIds.value.has(item.id)) return;
  failedRemoteIconIds.value = new Set([...failedRemoteIconIds.value, item.id]);
}

async function loadCatalogs() {
  catalogLoading.value = true;
  try {
    catalogs.value = await fetchRecyclingCatalogs();
    if (catalogs.value.length > 0 && !store.selectedCatalog) {
      store.selectedCatalog = catalogs.value[0];
    }
    console.info('[booking-recycling] catalogs loaded, count=', catalogs.value.length);
  } catch (e) {
    console.info('[booking-recycling] load catalogs failed', e);
    uni.showToast({ title: '服务列表加载失败', icon: 'none' });
  } finally {
    catalogLoading.value = false;
  }
}

function selectCatalog(item: ServiceCatalogDto) {
  store.selectedCatalog = item;
}

function changeWeight(delta: number) {
  const next = store.estimatedWeight + delta;
  if (next >= 5) {
    store.estimatedWeight = next;
  }
}

// ───────────────────── Step 2 日历 ─────────────────────
const today = new Date();
const calYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth() + 1);

interface CalCell {
  day: number | null;
  dateStr: string;
  lunar: string;
  disabled: boolean;
  isToday: boolean;
}

const calCells = computed<CalCell[]>(() => {
  const y = calYear.value;
  const m = calMonth.value;
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: CalCell[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: '', lunar: '', disabled: false, isToday: false });
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isPast = dateStr < todayStr;
    const { lunarDay } = getSolarToLunar(y, m, d);
    cells.push({
      day: d,
      dateStr,
      lunar: lunarDay,
      disabled: isPast,
      isToday: dateStr === todayStr,
    });
  }
  return cells;
});

function changeMonth(delta: number) {
  let m = calMonth.value + delta;
  let y = calYear.value;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  calMonth.value = m;
  calYear.value = y;
}

function selectDate(cell: CalCell) {
  store.selectedDate = cell.dateStr;
}

// ───────────────────── Step 2 地址 ─────────────────────
async function loadDefaultAddress() {
  if (!authStore.resident?.id) return;
  if (store.selectedAddress) return;
  try {
    const list = await fetchAddresses(authStore.resident.id);
    if (list.length > 0) {
      store.selectedAddress = list[0];
    }
  } catch (e) {
    console.info('[booking-recycling] load address failed', e);
  }
}

function goAddressSelect() {
  uni.navigateTo({ url: '/pages/address-select/index?from=recycling' });
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

// ───────────────────── Step 3 显示计算 ─────────────────────
const appointTimeDisplay = computed(() => {
  if (!store.selectedDate || !store.selectedTime) return '-';
  const parts = store.selectedDate.split('-');
  return `${parts[1]}-${parts[2]} ${store.selectedTime}`;
});

const appointAddrDisplay = computed(() => {
  if (!store.selectedAddress) return '-';
  return `${store.selectedAddress.district} ${store.selectedAddress.detail}`;
});

// ───────────────────── 步骤控制 ─────────────────────
function nextStep() {
  if (store.step === 1) {
    if (!store.selectedCatalog) {
      uni.showToast({ title: '请选择回收类型', icon: 'none' });
      return;
    }
    store.goStep(2);
    loadDefaultAddress();
    if (!store.selectedDate) {
      store.selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return;
  }
  if (store.step === 2) {
    if (!store.selectedDate) {
      uni.showToast({ title: '请选择预约日期', icon: 'none' });
      return;
    }
    if (!store.selectedTime) {
      uni.showToast({ title: '请选择预约时段', icon: 'none' });
      return;
    }
    if (!store.selectedAddress) {
      uni.showToast({ title: '请选择服务地址', icon: 'none' });
      return;
    }
    store.goStep(3);
  }
}

function prevStep() {
  if (store.step > 1) {
    store.goStep((store.step - 1) as 1 | 2 | 3);
  }
}

// ───────────────────── 提交订单 ─────────────────────
const submitting = ref(false);

async function submitOrder() {
  if (!authStore.resident?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  if (store.isProxy) {
    if (!store.serviceContactName.trim()) {
      uni.showToast({ title: '请填写服务对象姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(store.serviceContactPhone)) {
      uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
      return;
    }
  }

  submitting.value = true;
  try {
    const addr = store.selectedAddress!;
    const result = await createRecyclingOrder({
      residentId: authStore.resident.id,
      serviceItem: store.selectedCatalog!.name,
      estimatedWeight: store.estimatedWeight,
      appointDate: store.selectedDate,
      appointTimeSlot: store.selectedTime,
      addressId: addr.id,
      contactName: addr.contactName,
      contactPhone: addr.contactPhone,
      isProxyOrder: store.isProxy,
      serviceContactName: store.isProxy ? store.serviceContactName.trim() : undefined,
      serviceContactPhone: store.isProxy ? store.serviceContactPhone.trim() : undefined,
      source: 'MINIPROGRAM',
      remark: store.remark || undefined,
    });

    console.info('[booking-recycling] order created, orderNo=', result.orderNo);
    store.reset();

    successOverlayRef.value?.show({ title: '预约成功', orderNo: result.orderNo });

    setTimeout(() => {
      uni.switchTab({ url: '/pages/orders/index' });
    }, 2000);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '提交失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[booking-recycling] submit failed', e);
  } finally {
    submitting.value = false;
  }
}

// ───────────────────── 生命周期 ─────────────────────
onLoad(() => {
  store.reset();
  loadCatalogs();
  console.info('[booking-recycling] page loaded');
});

onShow(() => {
  console.info('[booking-recycling] page shown, step=', store.step);
});
</script>

<style scoped>
.booking-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F8FAFF;
}

/* ── 步骤条 ── */
.stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 30rpx 32rpx;
  background: #fff;
  position: relative;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.step-circle {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #d9dde6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.step-circle.current {
  background: #236EFF;
}

.step-circle.active {
  background: #236EFF;
}

.step-num {
  font-size: 26rpx;
  color: #9CABBA;
  font-weight: bold;
}

.step-num.active {
	color: #FFF;
  font-size: 26rpx;
}
.step-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  white-space: nowrap;
}

.step-label.active {
  color: #236EFF;
}

.step-line {
  position: absolute;
  top: 28rpx;
  left: 50%;
  width: 100%;
  height: 4rpx;
  background: #d9dde6;
  z-index: 0;
}

.step-line.active {
  background: #236EFF;
}

/* ── 滚动区 ── */
.scroll-area {
  flex: 1;
  height: 0;
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* ── 通用 section ── */
.section-wrap-1 {
  border-radius: 30rpx;
  margin: 20rpx 26rpx;
  padding: 24rpx 0;
}

.section-wrap {
  border-radius: 30rpx;
  margin: 20rpx 26rpx;
  padding: 24rpx;
  background-color: #FFF;
}

.sub-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-top: 20rpx;
  padding-bottom: 20rpx;
  display: block;
  border-bottom: 1rpx solid #F7F9FA;
}

/* ── Step 1 卡片 ── */
.service-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 52rpx 28rpx;
  border-radius: 30rpx;
  border: 2rpx solid #fff;
  margin-bottom: 20rpx;
  background: #fff;
}

.service-card.selected {
  border-color: #236EFF;
  background: #fff;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.card-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  background: #f0f6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  font-size: 40rpx;
}

.card-icon-img {
  width: 100rpx;
  height: 100rpx;
}

.card-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #303030;
  display: block;
}

.card-subtitle {
  font-size: 28rpx;
  color: #303030;
  margin-top: 6rpx;
  display: block;
}

.card-check {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #236EFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

/* ── 大件提示 ── */
.hint-row {
  margin: 0 26rpx 16rpx;
  background-color: #e6f4ff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}

.hint-text {
  font-size: 26rpx;
  color: #236EFF;
}

/* ── 重量步进器 ── */
.weight-row {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 16rpx;
  margin: 0rpx 24rpx;
  padding: 28rpx 24rpx;
}

.weight-label {
  font-size: 32rpx;
  color: #303030;
  font-weight: bold;
}

.stepper-ctrl {
  display: flex;
  align-items: center;
  gap: 0;
  background: #f5f6fa;
  border-radius: 40rpx;
  padding: 6rpx 16rpx;
}

.ctrl-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #236EFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctrl-btn-1 {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #236EFF;
  line-height: 60rpx;
  font-size: 36rpx;
  font-weight: bold;
}

.ctrl-btn-1.disabled {
  background: #d9d9d9;
  color: #FFF;
}

.ctrl-btn.disabled {
  background: #d9d9d9;
}

.ctrl-text {
  color: #fff;
  line-height: 60rpx;
  font-size: 36rpx;
  font-weight: bold;
}

.ctrl-val {
  min-width: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.val-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.val-unit {
  font-size: 22rpx;
  color: #999;
}

/* ── Step 2 日历 ── */
.calendar-wrap {
  background: #fff;
  border-radius: 30rpx;
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.cal-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.nav-arrow {
  font-size: 26rpx;
  color: #236EFF;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8rpx;
}

.weekday {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4rpx;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  border-radius: 8rpx;
  position: relative;
}

.cal-cell.empty {
  visibility: hidden;
}

.cal-cell.disabled .cell-day {
  color: #ccc;
}

.cal-cell.disabled .cell-lunar {
  color: #ddd;
}

.cal-cell.today .cell-day {
  color: #236EFF;
  font-weight: 600;
}

.cal-cell.selected {
  background: #236EFF;
  border-radius: 50%;
}

.cal-cell.selected .cell-day,
.cal-cell.selected .cell-lunar {
  color: #fff;
}

.cell-day {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.cell-lunar {
  font-size: 18rpx;
  color: #bbb;
  margin-top: 2rpx;
}

/* ── 时段格 ── */
.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding-top: 20rpx;
}

.time-btn {
  padding: 18rpx 0;
  border-radius: 12rpx;
  border: 1rpx solid #FFF;
  text-align: center;
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  background: #F2F3FC;
}

.time-btn.selected {
  border-color: #236EFF;
  color: #236EFF;
  background: #f0f6ff;
}

/* ── 地址行 ── */
.addr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.addr-main {
  flex: 1;
  padding-top: 20rpx;
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.addr-badge {
  font-size: 20rpx;
  background-color: #236EFF;
  color: #fff;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}

.addr-district {
  font-size: 28rpx;
  color: #373737;
}

.addr-detail {
  font-size: 36rpx;
  color: #373737;
  padding: 10rpx 0;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.addr-contact {
  font-size: 28rpx;
  color: #373737;
}

.addr-arrow {
  font-size: 40rpx;
  color: #ccc;
  padding-left: 16rpx;
}

.addr-empty {
  padding: 20rpx 0;
}

.addr-empty-text {
  font-size: 28rpx;
  color: #236EFF;
}

/* ── 代下单单选 ── */
.proxy-section .sub-title {
  margin-bottom: 24rpx;
}

.radio-group {
  display: flex;
  gap: 48rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.radio-icon {
  width: 32rpx;
  height: 32rpx;
}

.radio-label {
  font-size: 32rpx;
  color: #333;
}

/* ── Step 3 订单卡 ── */
.order-card {
  border-radius: 12rpx;
  overflow: hidden;
}

.order-row {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-row:last-child {
  border-bottom: none;
}

.order-key {
  font-size: 30rpx;
  color: #666;
}

.order-val {
  font-size: 30rpx;
  color: #333333;
}

/* ── 代下单输入 ── */
.input-card {
  border-radius: 12rpx;
}

.input-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.input-row:last-child {
  border-bottom: none;
}

.input-label {
  width: 120rpx;
  font-size: 30rpx;
  color: #333;
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
}

/* ── 备注 ── */
.remark-wrap {
  background: #F7F9FA;
  border-radius: 20rpx;
  padding: 26rpx;
}

.remark-area {
  width: 100%;
  min-height: 160rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

/* ── 服务须知 ── */
.notice-wrap {
  margin: 20rpx 24rpx 120rpx;
  padding: 30rpx 8rpx;
}

.notice-title-text {
  font-size: 30rpx;
  color: #A3B1CD;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.notice-item-text {
  font-size: 30rpx;
  color: #A3B1CD;
  display: block;
  line-height: 1.8;
}

/* ── 底部按钮 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.back-btn {
  flex: 0 0 180rpx;
  height: 88rpx;
  border-radius: 20rpx;
  border: 2rpx solid #236EFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-text {
  font-size: 30rpx;
  color: #236EFF;
}

.next-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #236EFF 0%, #1AA1FF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-btn.loading {
  background: #91b8ff;
}

.next-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

/* ── 加载/空态 ── */
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
