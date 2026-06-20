<template>
  <view class="page">
    <!-- 地址列表 -->
    <scroll-view scroll-y class="scroll-area">
      <view v-if="loading" class="tip-text">加载中...</view>

      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="addr-card"
        :class="{ selected: bookingStore.selectedAddress?.id === addr.id }"
        @tap="selectAddress(addr)"
      >
        <view class="addr-top">
          <view v-if="addr.isDefault" class="default-badge">默认</view>
          <text class="addr-name">{{ addr.contactName }}</text>
          <text class="addr-phone">{{ maskPhone(addr.contactPhone) }}</text>
        </view>
        <text class="addr-detail">{{ addr.district }} {{ addr.detail }}</text>
        <view v-if="bookingStore.selectedAddress?.id === addr.id" class="check-mark">
          <text class="check-icon">✓</text>
        </view>
      </view>

      <view v-if="!loading && addresses.length === 0" class="empty-wrap">
        <text class="tip-text">暂无地址</text>
      </view>
    </scroll-view>

    <!-- 底部新增按钮 -->
    <view class="bottom-bar">
      <view class="add-btn" @tap="openAddForm">
        <text class="add-btn-text">+ 新增地址</text>
      </view>
    </view>

    <!-- 新增地址底部弹层 -->
    <view v-if="showAddForm" class="form-mask" @tap="onMaskTap">
      <!-- @tap.stop 阻止内部事件冒泡到遮罩层，避免点击 input 时弹层被误关闭 -->
      <view class="form-sheet" @tap.stop>
        <view class="form-header">
          <text class="form-title">新增地址</text>
          <view class="form-close" @tap="closeAddForm"><text class="form-close-icon">✕</text></view>
        </view>

        <scroll-view scroll-y class="form-scroll">
          <view class="form-body">
            <!-- 姓名 -->
            <view class="form-row">
              <text class="form-label"><text class="required">*</text> 姓名</text>
              <input
                class="form-input"
                placeholder="请输入联系人姓名"
                :value="form.name"
                @input="form.name = $event.detail.value"
              />
            </view>

            <!-- 手机号 -->
            <view class="form-row">
              <text class="form-label"><text class="required">*</text> 手机号</text>
              <input
                class="form-input"
                type="number"
                maxlength="11"
                placeholder="请输入手机号"
                :value="form.phone"
                @input="form.phone = $event.detail.value"
              />
            </view>

            <!-- 省份 -->
            <view class="form-row">
              <text class="form-label"><text class="required">*</text> 省份</text>
              <input
                class="form-input"
                placeholder="如：广东省"
                :value="form.province"
                @input="form.province = $event.detail.value"
              />
            </view>

            <!-- 城市 -->
            <view class="form-row">
              <text class="form-label"><text class="required">*</text> 城市</text>
              <input
                class="form-input"
                placeholder="如：广州市"
                :value="form.city"
                @input="form.city = $event.detail.value"
              />
            </view>

            <!-- 区域 -->
            <view class="form-row">
              <text class="form-label"><text class="required">*</text> 区域</text>
              <input
                class="form-input"
                placeholder="如：天河区"
                :value="form.district"
                @input="form.district = $event.detail.value"
              />
            </view>

            <!-- 详细地址 -->
            <view class="form-row form-row-detail">
              <text class="form-label"><text class="required">*</text> 详细地址</text>
              <textarea
                class="form-textarea"
                placeholder="请输入楼栋、门牌号等详细地址"
                :value="form.detail"
                @input="form.detail = $event.detail.value"
                maxlength="100"
              />
            </view>

            <!-- 设为默认 -->
            <view class="form-row form-row-switch">
              <text class="form-label">设为默认地址</text>
              <view
                class="switch-wrap"
                :class="{ 'switch-on': form.isDefault }"
                @tap="form.isDefault = !form.isDefault"
              >
                <view class="switch-thumb" />
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="form-footer">
          <view class="submit-btn" :class="{ 'submit-loading': submitting }" @tap="submitAdd">
            <text class="submit-text">{{ submitting ? '保存中...' : '保存地址' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useBookingCleaningStore } from '@/store/booking-cleaning';
import { useBookingRecyclingStore } from '@/store/booking-recycling';
import { useAuthStore } from '@/store/auth';
import { fetchAddresses, createAddress, type AddressDto } from '@/api/address';

const cleaningStore = useBookingCleaningStore();
const recyclingStore = useBookingRecyclingStore();
const authStore = useAuthStore();

/** 来源标识：cleaning | recycling，由跳转方传入，决定回填哪个 store */
const fromStore = ref<'cleaning' | 'recycling'>('cleaning');

/** 根据来源路由写入对应 store 的 selectedAddress */
function setSelectedAddress(addr: AddressDto) {
  if (fromStore.value === 'recycling') {
    recyclingStore.selectedAddress = addr;
  } else {
    cleaningStore.selectedAddress = addr;
  }
}

/** 遮罩层点击：只有直接点到遮罩本身才关闭（form-sheet 已 @tap.stop 拦截冒泡） */
function onMaskTap() {
  closeAddForm();
}

const addresses = ref<AddressDto[]>([]);
const loading = ref(false);
const showAddForm = ref(false);
const submitting = ref(false);

interface AddressForm {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

const form = reactive<AddressForm>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
});

function resetForm() {
  form.name = '';
  form.phone = '';
  form.province = '';
  form.city = '';
  form.district = '';
  form.detail = '';
  form.isDefault = false;
}

async function loadAddresses() {
  if (!authStore.resident?.id) return;
  loading.value = true;
  try {
    addresses.value = await fetchAddresses(authStore.resident.id);
    console.info('[address-select] loaded, count=', addresses.value.length);
  } catch (e) {
    console.info('[address-select] load failed', e);
    uni.showToast({ title: '地址加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function selectAddress(addr: AddressDto) {
  setSelectedAddress(addr);
  console.info('[address-select] selected addressId=', addr.id, 'for=', fromStore.value);
  uni.navigateBack();
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function openAddForm() {
  resetForm();
  // 没有地址时默认设为默认
  if (addresses.value.length === 0) {
    form.isDefault = true;
  }
  showAddForm.value = true;
  console.info('[address-select] open add form');
}

function closeAddForm() {
  showAddForm.value = false;
}

async function submitAdd() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请填写联系人姓名', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
    return;
  }
  if (!form.province.trim()) {
    uni.showToast({ title: '请填写省份', icon: 'none' });
    return;
  }
  if (!form.city.trim()) {
    uni.showToast({ title: '请填写城市', icon: 'none' });
    return;
  }
  if (!form.district.trim()) {
    uni.showToast({ title: '请填写区域', icon: 'none' });
    return;
  }
  if (!form.detail.trim()) {
    uni.showToast({ title: '请填写详细地址', icon: 'none' });
    return;
  }

  if (!authStore.resident?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const newAddr = await createAddress({
      residentId: authStore.resident.id,
      contactName: form.name.trim(),
      contactPhone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
      isDefault: form.isDefault,
    });

    console.info('[address-select] address created, id=', newAddr.id);
    uni.showToast({ title: '地址添加成功', icon: 'success' });

    // 自动选中新地址并返回预约页
    setSelectedAddress(newAddr);
    showAddForm.value = false;

    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch (e) {
    console.info('[address-select] create address failed', e);
    uni.showToast({ title: '添加失败，请重试', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((options?: Record<string, string>) => {
  if (options?.from === 'recycling') {
    fromStore.value = 'recycling';
  }
  console.info('[address-select] from=', fromStore.value);
  loadAddresses();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

.scroll-area {
  flex: 1;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
  height: calc(100vh - 120rpx);
}

/* ── 地址卡片 ── */
.addr-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid #e8e8e8;
  position: relative;
}

.addr-card.selected {
  border-color: #1677ff;
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.default-badge {
  font-size: 20rpx;
  color: #1677ff;
  border: 2rpx solid #1677ff;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}

.addr-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.addr-phone {
  font-size: 26rpx;
  color: #666;
}

.addr-detail {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.check-mark {
  position: absolute;
  top: 28rpx;
  right: 24rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

.empty-wrap {
  padding: 80rpx 0 40rpx;
}

.tip-text {
  text-align: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: #999;
}

/* ── 底部新增按钮 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.add-btn {
  height: 88rpx;
  border-radius: 44rpx;
  border: 2rpx solid #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn-text {
  font-size: 30rpx;
  color: #1677ff;
  font-weight: 500;
}

/* ── 新增地址弹层 ── */
.form-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.form-sheet {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.form-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.form-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-close-icon {
  font-size: 28rpx;
  color: #999;
}

.form-scroll {
  flex: 1;
  overflow: hidden;
}

.form-body {
  padding: 8rpx 32rpx 24rpx;
}

.form-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 16rpx;
}

.form-row:last-child {
  border-bottom: none;
}

.form-row-detail {
  align-items: flex-start;
}

.form-row-switch {
  border-bottom: none;
  justify-content: space-between;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
  width: 140rpx;
}

.required {
  color: #ff4d4f;
  margin-right: 4rpx;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
}

.form-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
  min-height: 100rpx;
  line-height: 1.6;
  text-align: right;
  width: 100%;
  box-sizing: border-box;
}

/* ── 开关 ── */
.switch-wrap {
  width: 96rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #d9d9d9;
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;
}

.switch-wrap.switch-on {
  background: #1677ff;
}

.switch-thumb {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  transition: left 0.25s;
}

.switch-on .switch-thumb {
  left: 50rpx;
}

/* ── 表单底部提交 ── */
.form-footer {
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.submit-btn {
  height: 88rpx;
  border-radius: 44rpx;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn.submit-loading {
  background: #91b8ff;
}

.submit-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}
</style>
