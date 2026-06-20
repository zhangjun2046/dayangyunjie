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
          <text class="step-num">{{ idx + 1 }}</text>
        </view>
        <text class="step-label" :class="{ active: store.step >= idx + 1 }">{{ label }}</text>
        <view v-if="idx < STEP_LABELS.length - 1" class="step-line" :class="{ active: store.step > idx + 1 }" />
      </view>
    </view>

    <!-- ===================== STEP 1: 选择服务类型 ===================== -->
    <scroll-view v-if="store.step === 1" scroll-y class="scroll-area">
      <view class="section-title-bar">
        <text class="section-title-text">请选择家政服务类型</text>
      </view>

      <!-- 加载中 -->
      <view v-if="catalogLoading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <!-- 服务类型卡片列表 -->
      <view class="catalog-list">
        <view
          v-for="item in catalogs"
          :key="item.id"
          class="service-card"
          :class="{ selected: store.selectedCatalog?.id === item.id }"
          @tap="selectCatalog(item)"
        >
          <view class="card-left">
            <view class="card-icon-wrap" :class="iconBgClass(item)">
              <text class="card-icon">{{ item.icon || defaultIcon(item) }}</text>
            </view>
            <view class="card-text">
              <text class="card-name">{{ item.name }}</text>
              <text v-if="item.subtitle" class="card-subtitle">{{ item.subtitle }}</text>
            </view>
          </view>
          <!-- 选中对勾 -->
          <view v-if="store.selectedCatalog?.id === item.id" class="card-check">
            <text class="check-icon">✓</text>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="!catalogLoading && catalogs.length === 0" class="empty-tip">
        <text>暂无可用服务类型，请联系客服</text>
      </view>

      <!-- 提示说明 -->
      <view class="tip-row">
        <text class="tip-text">选择服务类型后，运营人员将在 24 小时内电话回访确认</text>
      </view>
    </scroll-view>

    <!-- ===================== STEP 2: 填写需求 ===================== -->
    <scroll-view v-if="store.step === 2" scroll-y class="scroll-area">
      <!-- 已选服务类型回显 -->
      <view class="selected-type-bar">
        <text class="selected-type-label">服务类型</text>
        <text class="selected-type-val">{{ store.selectedCatalog?.name }}</text>
      </view>

      <!-- 代家人下单开关 -->
      <view class="section-wrap proxy-section">
        <view class="proxy-row">
          <view class="proxy-left">
            <text class="proxy-title">是否为家人代下单</text>
            <text class="proxy-desc">勾选后需填写服务对象信息</text>
          </view>
          <view class="proxy-switch" :class="{ on: store.isProxy }" @tap="store.isProxy = !store.isProxy">
            <view class="switch-knob" :class="{ on: store.isProxy }" />
          </view>
        </view>
      </view>

      <!-- 服务对象信息（代下单时展开） -->
      <view v-if="store.isProxy" class="section-wrap">
        <text class="sub-title">服务对象信息</text>
        <view class="input-card">
          <view class="input-row">
            <text class="input-label required">姓名</text>
            <input
              class="input-field"
              placeholder="请输入服务对象姓名"
              :value="store.serviceContactName"
              @input="store.serviceContactName = $event.detail.value"
            />
          </view>
          <view class="input-row">
            <text class="input-label required">手机号</text>
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

      <!-- 核心诉求 -->
      <view class="section-wrap">
        <text class="sub-title required-title">核心诉求</text>
        <view class="textarea-wrap">
          <textarea
            class="requirement-area"
            placeholder="请详细描述您的家政服务需求，如：需要一名保姆照顾老人，每天 8 小时，擅长做饭..."
            :value="store.requirementDesc"
            @input="store.requirementDesc = $event.detail.value"
            maxlength="1000"
          />
          <text class="textarea-count">{{ store.requirementDesc.length }}/1000</text>
        </view>
      </view>

      <!-- 联系人信息 -->
      <view class="section-wrap">
        <text class="sub-title required-title">联系人信息</text>
        <view class="input-card">
          <view class="input-row">
            <text class="input-label required">姓名</text>
            <input
              class="input-field"
              placeholder="请输入您的姓名"
              :value="store.contactName"
              @input="store.contactName = $event.detail.value"
            />
          </view>
          <view class="input-row">
            <text class="input-label required">电话</text>
            <input
              class="input-field"
              type="number"
              maxlength="11"
              placeholder="请输入您的联系电话"
              :value="store.contactPhone"
              @input="store.contactPhone = $event.detail.value"
            />
          </view>
        </view>
        <text class="addr-tip">运营人员将通过此电话联系您</text>
      </view>

      <!-- 备注（可选） -->
      <view class="section-wrap">
        <text class="sub-title">备注（可选）</text>
        <view class="textarea-wrap">
          <textarea
            class="remark-area"
            placeholder="其他补充说明..."
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
        @tap="store.step < 2 ? nextStep() : submitOrder()"
      >
        <text class="next-text">{{ store.step === 2 ? '提交' : '下一步' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useBookingConsultStore } from '@/store/booking-consult';
import { useAuthStore } from '@/store/auth';
import { fetchConsultCatalogs, type ServiceCatalogDto } from '@/api/service-catalog';
import { createConsultOrder } from '@/api/consult-order';

const store = useBookingConsultStore();
const authStore = useAuthStore();

// ───────────────────── 常量 ─────────────────────
const STEP_LABELS = ['选择类型', '填写需求'];

const SERVICE_NOTICES = [
  '提交后运营人员将在 24 小时内电话回访',
  '请确保联系电话可正常接听',
  '无需提供服务地址，运营人员电话确认后录入',
  '家政服务无法在线自助预约，须经顾问确认后安排',
];

// ───────────────────── Step 1 服务目录 ─────────────────────
const catalogs = ref<ServiceCatalogDto[]>([]);
const catalogLoading = ref(false);

/** 为没有图标的条目提供默认 emoji */
function defaultIcon(item: ServiceCatalogDto): string {
  const iconMap: Record<string, string> = {
    保姆: '👩',
    月嫂: '🤱',
    育儿嫂: '👶',
    陪诊: '🏥',
    代买菜: '🛒',
    老人陪护: '👴',
    家电维修: '🔧',
    搬家: '📦',
  };
  return iconMap[item.name] ?? '🏠';
}

/** 图标背景色循环 */
const ICON_BG_CLASSES = ['bg-pink', 'bg-purple', 'bg-orange', 'bg-green', 'bg-blue'];
function iconBgClass(item: ServiceCatalogDto): string {
  const idx = catalogs.value.indexOf(item) % ICON_BG_CLASSES.length;
  return ICON_BG_CLASSES[idx];
}

async function loadCatalogs() {
  catalogLoading.value = true;
  try {
    catalogs.value = await fetchConsultCatalogs();
    // 默认选中第一条
    if (catalogs.value.length > 0 && !store.selectedCatalog) {
      store.selectedCatalog = catalogs.value[0];
    }
    console.info('[booking-consult] catalogs loaded, count=', catalogs.value.length);
  } catch (e) {
    console.info('[booking-consult] load catalogs failed', e);
    uni.showToast({ title: '服务列表加载失败', icon: 'none' });
  } finally {
    catalogLoading.value = false;
  }
}

function selectCatalog(item: ServiceCatalogDto) {
  store.selectedCatalog = item;
}

// ───────────────────── 步骤控制 ─────────────────────
function nextStep() {
  if (store.step === 1) {
    if (!store.selectedCatalog) {
      uni.showToast({ title: '请选择服务类型', icon: 'none' });
      return;
    }
    store.goStep(2);
  }
}

function prevStep() {
  if (store.step > 1) {
    store.goStep((store.step - 1) as 1 | 2);
  }
}

// ───────────────────── 提交咨询单 ─────────────────────
const submitting = ref(false);

async function submitOrder() {
  // 表单校验
  if (!store.requirementDesc.trim()) {
    uni.showToast({ title: '请填写核心诉求', icon: 'none' });
    return;
  }
  if (!store.contactName.trim()) {
    uni.showToast({ title: '请填写联系人姓名', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(store.contactPhone)) {
    uni.showToast({ title: '请填写正确的联系电话', icon: 'none' });
    return;
  }
  if (store.isProxy) {
    if (!store.serviceContactName.trim()) {
      uni.showToast({ title: '请填写服务对象姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(store.serviceContactPhone)) {
      uni.showToast({ title: '请填写正确的服务对象手机号', icon: 'none' });
      return;
    }
  }

  submitting.value = true;
  try {
    const result = await createConsultOrder({
      serviceType: store.selectedCatalog!.name,
      contactName: store.contactName.trim(),
      contactPhone: store.contactPhone.trim(),
      requirementDesc: store.requirementDesc.trim(),
      residentId: authStore.resident?.id,
      isProxyOrder: store.isProxy,
      serviceContactName: store.isProxy ? store.serviceContactName.trim() : undefined,
      serviceContactPhone: store.isProxy ? store.serviceContactPhone.trim() : undefined,
      source: 'MINIPROGRAM',
      remark: store.remark.trim() || undefined,
    });

    console.info('[booking-consult] order created, orderNo=', result.orderNo);
    store.reset();

    uni.showToast({
      title: `提交成功\n${result.orderNo}`,
      icon: 'success',
      duration: 2500,
    });

    setTimeout(() => {
      uni.switchTab({ url: '/pages/orders/index' });
    }, 2600);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '提交失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[booking-consult] submit failed', e);
  } finally {
    submitting.value = false;
  }
}

// ───────────────────── 生命周期 ─────────────────────
onLoad(() => {
  store.reset();
  loadCatalogs();
  console.info('[booking-consult] page loaded');
});

onShow(() => {
  console.info('[booking-consult] page shown, step=', store.step);
});
</script>

<style scoped>
.booking-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6fa;
}

/* ── 步骤条 ── */
.stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24rpx 32rpx 16rpx;
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
  background: #fa8c16;
}

.step-circle.active {
  background: #fa8c16;
}

.step-num {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.step-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  white-space: nowrap;
}

.step-label.active {
  color: #fa8c16;
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
  background: #fa8c16;
}

/* ── 滚动区 ── */
.scroll-area {
  flex: 1;
  height: 0;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* ── Step 1 标题条 ── */
.section-title-bar {
  padding: 28rpx 32rpx 12rpx;
}

.section-title-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

/* ── 服务目录卡片列表 ── */
.catalog-list {
  margin: 0 24rpx;
}

.service-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  border: 2rpx solid #e8e8e8;
  margin-bottom: 20rpx;
  background: #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.service-card.selected {
  border-color: #fa8c16;
  background: #fff8f0;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.card-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 循环背景色（对照附图中的彩色图标） */
.bg-pink   { background: #ffe0e6; }
.bg-purple { background: #ede0ff; }
.bg-orange { background: #fff0d9; }
.bg-green  { background: #d6f5e3; }
.bg-blue   { background: #dceeff; }

.card-icon {
  font-size: 40rpx;
}

.card-text {
  flex: 1;
}

.card-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
}

.card-subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.card-check {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-icon {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

/* ── 提示说明 ── */
.tip-row {
  margin: 12rpx 32rpx 24rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #bbb;
  line-height: 1.7;
}

/* ── 加载/空态 ── */
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}

/* ── Step 2 通用 section ── */
.section-wrap {
  background: #fff;
  border-radius: 16rpx;
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
}

.sub-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20rpx;
  display: block;
}

.required-title::before {
  content: '* ';
  color: #ff4d4f;
}

/* ── 已选服务类型回显 ── */
.selected-type-bar {
  background: #fff8f0;
  border-radius: 16rpx;
  margin: 20rpx 24rpx 0;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 2rpx solid #fa8c16;
}

.selected-type-label {
  font-size: 28rpx;
  color: #999;
}

.selected-type-val {
  font-size: 30rpx;
  font-weight: 700;
  color: #fa8c16;
}

/* ── 代下单开关 ── */
.proxy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.proxy-left {
  flex: 1;
}

.proxy-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
}

.proxy-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}

.proxy-switch {
  width: 100rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background: #d9d9d9;
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;
}

.proxy-switch.on {
  background: #fa8c16;
}

.switch-knob {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  transition: left 0.25s;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.switch-knob.on {
  left: 50rpx;
}

/* ── 输入行 ── */
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
  font-size: 28rpx;
  color: #666;
  flex-shrink: 0;
}

.input-label.required::before {
  content: '* ';
  color: #ff4d4f;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
}

/* ── 核心诉求文本框 ── */
.textarea-wrap {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 16rpx;
  position: relative;
}

.requirement-area {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  line-height: 1.7;
}

.remark-area {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.textarea-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}

/* ── 地址提示 ── */
.addr-tip {
  font-size: 24rpx;
  color: #bbb;
  margin-top: 16rpx;
  display: block;
}

/* ── 服务须知 ── */
.notice-wrap {
  margin: 20rpx 24rpx 120rpx;
  padding: 0 8rpx;
}

.notice-title-text {
  font-size: 24rpx;
  color: #bbb;
  display: block;
  margin-bottom: 12rpx;
}

.notice-item-text {
  font-size: 22rpx;
  color: #ccc;
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
  border-radius: 44rpx;
  border: 2rpx solid #fa8c16;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-text {
  font-size: 30rpx;
  color: #fa8c16;
}

.next-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(90deg, #fa8c16 0%, #fadb14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-btn.loading {
  opacity: 0.6;
}

.next-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}
</style>
