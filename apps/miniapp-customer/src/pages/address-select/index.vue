<template>
  <view class="page">
    <view v-if="!loading && addresses.length === 0" class="empty-wrap">
      <image class="empty-icon" src="/static/icons/icon_empty.png" mode="aspectFit" />
      <text class="empty-text">暂无地址，请添加新地址</text>
    </view>

    <scroll-view v-else class="list-scroll" scroll-y>
      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="addr-card"
        :class="{ selected: selectedAddressId === addr.id }"
        @tap="selectAddress(addr)"
      >
        <view class="addr-header">
          <text class="addr-name">{{ addr.contactName }}</text>
          <text class="addr-phone">{{ maskPhone(addr.contactPhone) }}</text>
          <view v-if="addr.isDefault" class="default-badge">
            <text class="default-badge-text">默认</text>
          </view>
        </view>
        <text class="addr-detail">{{ formatAddress(addr) }}</text>
        <!-- <view v-if="selectedAddressId === addr.id" class="check-mark">
          <image class="check-icon-img" src="/static/icons/radio-checked.png" mode="aspectFit" />
        </view> -->
      </view>
      <view class="bottom-placeholder" />
    </scroll-view>

    <view class="fab-wrap">
      <view class="fab-btn" @tap="onOpenAdd">
        <text class="fab-icon">+</text>
        <text class="fab-text">添加新地址</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useBookingCleaningStore } from '@/store/booking-cleaning';
import { useBookingRecyclingStore } from '@/store/booking-recycling';
import { useAuthStore } from '@/store/auth';
import { fetchAddresses, type AddressDto } from '@/api/address';

const cleaningStore = useBookingCleaningStore();
const recyclingStore = useBookingRecyclingStore();
const authStore = useAuthStore();

/** 来源标识：cleaning | recycling，由跳转方传入，决定回填哪个 store */
const fromStore = ref<'cleaning' | 'recycling'>('cleaning');

const selectedAddressId = computed(() => {
  const addr =
    fromStore.value === 'recycling'
      ? recyclingStore.selectedAddress
      : cleaningStore.selectedAddress;
  return addr?.id ?? null;
});

const addresses = ref<AddressDto[]>([]);
const loading = ref(false);

onLoad((options?: Record<string, string>) => {
  if (options?.from === 'recycling') {
    fromStore.value = 'recycling';
  }
});

onShow(async () => {
  await loadAddresses();
});

async function loadAddresses() {
  const residentId = authStore.resident?.id;
  if (!residentId) return;
  loading.value = true;
  try {
    addresses.value = await fetchAddresses(residentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '地址加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function setSelectedAddress(addr: AddressDto) {
  if (fromStore.value === 'recycling') {
    recyclingStore.selectedAddress = addr;
  } else {
    cleaningStore.selectedAddress = addr;
  }
}

function selectAddress(addr: AddressDto) {
  setSelectedAddress(addr);
  uni.navigateBack();
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function formatAddress(addr: AddressDto): string {
  return [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(' ');
}

function onOpenAdd() {
  uni.navigateTo({ url: '/pages/address-edit/index' });
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
	background: #F8FAFF;
  position: relative;
}

.empty-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* justify-content: center; */
	padding-top: 120rpx;
  padding-bottom: 160rpx;
}

.empty-icon {
  width: 320rpx;
  height: 320rpx;
  margin-bottom: 8rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.list-scroll {
  flex: 1;
}

.addr-card {
  background: #ffffff;
  margin: 20rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid transparent;
  position: relative;
}

.addr-card.selected {
  border-color: #236EFF;
}

.addr-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 16rpx;
  padding-right: 56rpx;
}

.addr-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #373737;
}

.addr-phone {
  font-size: 34rpx;
  color: #373737;
}

.default-badge {
  background: #e8f1ff;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.default-badge-text {
  font-size: 22rpx;
  color: #236EFF;
}

.addr-detail {
  font-size: 32rpx;
  color: #373737;
  line-height: 1.6;
  padding-right: 56rpx;
}

.check-mark {
  position: absolute;
  top: 28rpx;
  right: 24rpx;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon-img {
  width: 44rpx;
  height: 44rpx;
}

.bottom-placeholder {
  height: 200rpx;
}

.fab-wrap {
  position: fixed;
  padding-top: 20rpx;
  padding-bottom: 60rpx;
  bottom: 0rpx;
  left: 0rpx;
  right: 0rpx;
  background: #FFF;
  padding-left: 48rpx;
  padding-right: 48rpx;
}

.fab-btn {
  border-radius: 20rpx;
  height: 88rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
}

.fab-icon {
  font-size: 40rpx;
  color: #ffffff;
  line-height: 1;
}

.fab-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
