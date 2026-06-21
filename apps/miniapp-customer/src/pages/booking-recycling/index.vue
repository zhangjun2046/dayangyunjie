<template>
  <view class="booking-page">
    <!-- 步骤条 -->
    <view class="stepper">
      <view
        v-for="(label, idx) in STEP_LABELS"
        :key="idx"
        class="step-item"
      >
        <view
          class="step-circle"
          :class="{ active: store.step > idx, current: store.step === idx + 1 }"
        >
          <text class="step-num">{{ idx + 1 }}</text>
        </view>
        <text class="step-label" :class="{ active: store.step >= idx + 1 }">{{ label }}</text>
        <view
          v-if="idx < STEP_LABELS.length - 1"
          class="step-line"
          :class="{ active: store.step > idx + 1 }"
        />
      </view>
    </view>

    <!-- ===================== STEP 1: 选择服务 ===================== -->
    <scroll-view v-if="store.step === 1" scroll-y class="scroll-area">
      <view class="section-wrap">
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
            <view class="card-icon-wrap" :class="iconBgClass(item)">
              <text class="card-icon">{{ item.icon || '♻️' }}</text>
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

      <!-- 预估重量步进器 -->
      <view class="weight-row">
        <text class="weight-label">预估重量（kg）</text>
        <view class="stepper-ctrl">
          <view
            class="ctrl-btn"
            :class="{ disabled: store.estimatedWeight <= 5 }"
            @tap="changeWeight(-5)"
          >
            <text class="ctrl-text">-</text>
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

      <!-- 大件搬运提示（仅大件类显示） -->
      <view v-if="isLargeItem" class="hint-row">
        <text class="hint-text">① 需搬运工上门，请确保保电梯可用</text>
      </view>
    </scroll-view>

    <!-- ===================== STEP 2: 预约时间 ===================== -->
    <scroll-view v-if="store.step === 2" scroll-y class="scroll-area">
      <!-- 日历 -->
      <view class="calendar-wrap">
        <view class="cal-header">
          <view class="cal-nav" @tap="changeMonth(-1)">
            <text class="nav-arrow">‹ 上个月</text>
          </view>
          <text class="cal-title">{{ calYear }} 年 {{ calMonth }} 月</text>
          <view class="cal-nav" @tap="changeMonth(1)">
            <text class="nav-arrow">下个月 ›</text>
          </view>
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
              <text class="addr-district">{{ store.selectedAddress.district }}</text>
            </view>
            <text class="addr-detail">{{ store.selectedAddress.detail }}</text>
            <text class="addr-contact">
              {{ store.selectedAddress.contactName }}
              {{ maskPhone(store.selectedAddress.contactPhone) }}
            </text>
          </view>
          <text class="addr-arrow">›</text>
        </view>
        <view v-else class="addr-empty">
          <text class="addr-empty-text">暂无地址，点击添加 ›</text>
        </view>
      </view>

      <!-- 代家人下单 -->
      <view class="section-wrap proxy-row">
        <text class="sub-title">是否为代家人下单</text>
        <view class="radio-group">
          <view class="radio-item" @tap="store.isProxy = true">
            <view class="radio-circle" :class="{ checked: store.isProxy }" />
            <text class="radio-label">是</text>
          </view>
          <view class="radio-item" @tap="store.isProxy = false">
            <view class="radio-circle" :class="{ checked: !store.isProxy }" />
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

const store = useBookingRecyclingStore();
const authStore = useAuthStore();

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

const isLargeItem = computed(() =>
  store.selectedCatalog?.name?.includes('大件') ?? false,
);

/** 卡片图标背景色：大件蓝、小件橙 */
function iconBgClass(item: ServiceCatalogDto) {
  return item.name?.includes('大件') ? 'icon-bg-blue' : 'icon-bg-orange';
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

    uni.showToast({
      title: `预约成功\n${result.orderNo}`,
      icon: 'success',
      duration: 2500,
    });

    setTimeout(() => {
      uni.switchTab({ url: '/pages/orders/index' });
    }, 2600);
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
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* ── 步骤条 ── */
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 48rpx 24rpx;
  background-color: #ffffff;
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
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.step-circle.current {
  background-color: #07c160;
}

.step-circle.active {
  background-color: #07c160;
}

.step-num {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.step-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 10rpx;
  white-space: nowrap;
}

.step-label.active {
  color: #07c160;
  font-weight: 600;
}

.step-line {
  position: absolute;
  top: 28rpx;
  left: calc(50% + 28rpx);
  width: calc(100% - 56rpx);
  height: 2rpx;
  background-color: #e0e0e0;
  z-index: 0;
}

.step-line.active {
  background-color: #07c160;
}

/* ── 滚动区域 ── */
.scroll-area {
  flex: 1;
  height: 0;
  padding-bottom: 180rpx;
}

/* ── Step 1: 服务卡片 ── */
.section-wrap {
  margin: 24rpx 24rpx 0;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.loading-tip,
.empty-tip {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}

.service-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-radius: 16rpx;
  border: 2rpx solid #f0f0f0;
  margin-bottom: 20rpx;
  background-color: #ffffff;
  transition: border-color 0.2s;
}

.service-card:last-child {
  margin-bottom: 0;
}

.service-card.selected {
  border-color: #07c160;
  background-color: #f0fff5;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}

.card-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-wrap.icon-bg-blue {
  background-color: #e6f4ff;
}

.card-icon-wrap.icon-bg-orange {
  background-color: #fff3e0;
}

.card-icon {
  font-size: 44rpx;
}

.card-text {
  display: flex;
  flex-direction: column;
}

.card-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8rpx;
}

.card-subtitle {
  font-size: 26rpx;
  color: #888;
  line-height: 1.5;
}

.card-check {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: #07c160;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-icon {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 700;
}

/* ── Step 1: 重量步进器 ── */
.weight-row {
  margin: 20rpx 24rpx 0;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.weight-label {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.stepper-ctrl {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ctrl-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #07c160;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctrl-btn.disabled {
  background-color: #e0e0e0;
}

.ctrl-text {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}

.ctrl-val {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  min-width: 100rpx;
  justify-content: center;
}

.val-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.val-unit {
  font-size: 26rpx;
  color: #888;
}

/* ── Step 1: 大件提示 ── */
.hint-row {
  margin: 16rpx 24rpx 0;
  background-color: #e6f4ff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}

.hint-text {
  font-size: 26rpx;
  color: #1677ff;
}

/* ── Step 2: 日历 ── */
.calendar-wrap {
  margin: 24rpx 24rpx 0;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.cal-nav {
  padding: 8rpx 16rpx;
}

.nav-arrow {
  font-size: 26rpx;
  color: #07c160;
}

.cal-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.cal-weekdays {
  display: flex;
  margin-bottom: 8rpx;
}

.weekday {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 0;
}

.cal-grid {
  display: flex;
  flex-wrap: wrap;
}

.cal-cell {
  width: calc(100% / 7);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.cal-cell.disabled .cell-day {
  color: #ccc;
}

.cal-cell.disabled .cell-lunar {
  color: #ddd;
}

.cal-cell.today .cell-day {
  color: #07c160;
  font-weight: 700;
}

.cal-cell.selected {
  background-color: #07c160;
}

.cal-cell.selected .cell-day,
.cal-cell.selected .cell-lunar {
  color: #ffffff;
}

.cell-day {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.cell-lunar {
  font-size: 20rpx;
  color: #aaa;
  margin-top: 4rpx;
}

/* ── Step 2: 时段 ── */
.sub-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.time-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.time-btn {
  width: calc(25% - 12rpx);
  height: 72rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.time-btn text {
  font-size: 28rpx;
  color: #333;
}

.time-btn.selected {
  border-color: #07c160;
  background-color: #f0fff5;
}

.time-btn.selected text {
  color: #07c160;
  font-weight: 600;
}

/* ── Step 2: 地址 ── */
.addr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.addr-main {
  flex: 1;
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.addr-badge {
  background-color: #07c160;
  color: #ffffff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.addr-district {
  font-size: 24rpx;
  color: #888;
}

.addr-detail {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6rpx;
}

.addr-contact {
  display: block;
  font-size: 26rpx;
  color: #888;
}

.addr-arrow {
  font-size: 40rpx;
  color: #ccc;
}

.addr-empty {
  padding: 16rpx 0;
}

.addr-empty-text {
  font-size: 28rpx;
  color: #07c160;
}

/* ── Step 2: 代下单 ── */
.proxy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.radio-group {
  display: flex;
  gap: 40rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.radio-circle {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  background-color: #fff;
}

.radio-circle.checked {
  border-color: #07c160;
  background-color: #07c160;
}

.radio-label {
  font-size: 28rpx;
  color: #333;
}

/* ── Step 3: 订单详情 ── */
.order-card {
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 4rpx 0;
}

.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-row:last-child {
  border-bottom: none;
}

.order-key {
  font-size: 28rpx;
  color: #888;
}

.order-val {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
  max-width: 60%;
  text-align: right;
}

/* ── Step 3: 代下单输入 ── */
.input-card {
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 4rpx 0;
}

.input-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.input-row:last-child {
  border-bottom: none;
}

.input-label {
  font-size: 28rpx;
  color: #888;
  width: 120rpx;
  flex-shrink: 0;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
}

/* ── Step 3: 备注 ── */
.remark-wrap {
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 16rpx;
}

.remark-area {
  width: 100%;
  min-height: 160rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

/* ── Step 3: 服务须知 ── */
.notice-wrap {
  margin: 24rpx 24rpx 0;
  padding: 16rpx 0;
}

.notice-title-text {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-bottom: 16rpx;
}

.notice-item-text {
  display: block;
  font-size: 26rpx;
  color: #07c160;
  margin-bottom: 12rpx;
  line-height: 1.6;
}

/* ── 底部按钮 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  display: flex;
  gap: 20rpx;
}

.back-btn {
  width: 180rpx;
  height: 96rpx;
  border-radius: 48rpx;
  border: 2rpx solid #07c160;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-text {
  font-size: 30rpx;
  color: #07c160;
  font-weight: 600;
}

.next-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #07c160 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-btn.loading {
  opacity: 0.6;
}

.next-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}
</style>
