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
      >
        <view class="addr-header">
          <text class="addr-name">{{ addr.contactName }}</text>
          <text class="addr-phone">{{ maskPhone(addr.contactPhone) }}</text>
        </view>
        <text class="addr-detail">{{ formatAddress(addr) }}</text>

        <view class="addr-actions">
          <view class="default-wrap" @tap="onSetDefault(addr)">
            <view class="default-check" :class="{ 'default-check-on': addr.isDefault }">
              <text v-if="addr.isDefault" class="default-check-mark">✓</text>
            </view>
            <text class="default-label">设为默认</text>
          </view>
          <view class="action-group">
            <view class="pill-btn" @tap="onDelete(addr.id)">
              <text class="pill-text">删除</text>
            </view>
            <view class="pill-btn" @tap="onEdit(addr.id)">
              <text class="pill-text">修改</text>
            </view>
          </view>
        </view>
      </view>
      <view class="bottom-placeholder" />
    </scroll-view>

    <view class="fab-wrap">
      <view class="fab-btn" @tap="onOpenAdd">
        <text class="fab-icon">+</text>
        <text class="fab-text">新增地址</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchAddresses,
  deleteAddress,
  setDefaultAddress,
  type AddressDto,
} from '@/api/address';

const authStore = useAuthStore();

const loading = ref(false);
const addresses = ref<AddressDto[]>([]);

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
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
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

function onEdit(id: number) {
  uni.navigateTo({ url: `/pages/address-edit/index?id=${id}` });
}

async function onSetDefault(addr: AddressDto) {
  if (addr.isDefault) return;
  try {
    await setDefaultAddress(addr.id);
    await loadAddresses();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '操作失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

async function onDelete(id: number) {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      success: (res) => resolve(res.confirm),
    });
  });
  if (!confirmed) return;
  try {
    await deleteAddress(id);
    await loadAddresses();
    uni.showToast({ title: '已删除', icon: 'success' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
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
}

.addr-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 16rpx;
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

.addr-detail {
  font-size: 32rpx;
  color: #373737;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.addr-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
	margin-top: 10rpx;
}

.default-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.default-check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 6rpx;
  border: 2rpx solid #cccccc;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-check-on {
  background: #236EFF;
  border-color: #236EFF;
}

.default-check-mark {
  font-size: 20rpx;
  color: #ffffff;
  line-height: 1;
}

.default-label {
  font-size: 26rpx;
  color: #666666;
}

.action-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.pill-btn {
  background: #f6f6f6;
  border-radius: 30rpx;
  padding: 0 28rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pill-text {
  font-size: 26rpx;
  color: #333333;
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
  /* box-shadow: 0 4rpx 20rpx rgba(22, 119, 255, 0.4); */
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
