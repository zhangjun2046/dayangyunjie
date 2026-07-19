<template>
  <view class="page">
    <!-- 用户信息卡片（淡蓝色渐变背景） -->
    <view class="user-card" @tap="onTapUserCard">
      <image
        class="avatar"
        :src="resident?.avatar || defaultAvatar"
        mode="aspectFill"
      />
      <view class="user-info">
        <text class="phone-number">{{ displayPhone }}</text>
        <text v-if="!resident?.phone && isLoggedIn" class="phone-hint">点击绑定完整手机号</text>
      </view>
    </view>

    <!-- 菜单组1：地址 & 投诉 & 通知 -->
    <view class="menu-group">
      <view class="menu-item" @tap="onGoAddress">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/address-pin.png" mode="aspectFit" />
          <text class="menu-label">我的地址</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onGoComplaintList">
        <view class="menu-left">
          <text class="menu-icon-emoji">📋</text>
          <text class="menu-label">我的投诉</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onNotification">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/notification-bell.png" mode="aspectFit" />
          <text class="menu-label">消息通知</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 菜单组2：客服 & 协议 -->
    <view class="menu-group">
      <view class="menu-item" @tap="onCallService">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/customer-service.png" mode="aspectFit" />
          <text class="menu-label">客服联系方式</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onServiceAgreement">
        <view class="menu-left">
          <text class="menu-icon-emoji">🤝</text>
          <text class="menu-label">服务协议</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onViewPrivacy">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/privacy-shield.png" mode="aspectFit" />
          <text class="menu-label">隐私协议</text>
        </view>
        <view class="menu-right">
          <text v-if="hasAgreedPrivacy" class="agreed-tag">已同意</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-wrap" v-if="isLoggedIn">
      <button class="btn-logout" @tap="onLogout">退出登录</button>
    </view>

    <!-- 隐私协议弹窗（再次查看） -->
    <PrivacyModal ref="privacyModalRef" @agreed="onPrivacyReAgreed" />

    <!-- 手机号绑定弹窗（phone 缺失时可重新绑定） -->
    <ProfileCompleteModal ref="profileModalRef" @completed="onPhoneCompleted" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import PrivacyModal from '@/components/PrivacyModal.vue';
import ProfileCompleteModal from '@/components/ProfileCompleteModal.vue';

/** 客服电话 */
const CUSTOMER_SERVICE_PHONE = '400-888-0000';

const authStore = useAuthStore();
const privacyModalRef = ref<InstanceType<typeof PrivacyModal> | null>(null);
const profileModalRef = ref<InstanceType<typeof ProfileCompleteModal> | null>(null);

const resident = computed(() => authStore.resident);
const isLoggedIn = computed(() => authStore.isLoggedIn);
const hasAgreedPrivacy = computed(() => authStore.hasAgreedPrivacy);
const defaultAvatar = '/static/images/default-avatar.png';

/** 显示手机号：有号码直接展示，否则用昵称/占位 */
const displayPhone = computed(() => {
  if (resident.value?.phone) return resident.value.phone;
  return resident.value?.nickname || '居民用户';
});

/** 点击用户卡片：若 phone 未绑定则弹出授权弹窗 */
function onTapUserCard() {
  if (!isLoggedIn.value) return;
  if (!resident.value?.phone) {
    profileModalRef.value?.show();
    console.info('[mine] phone not bound, showing profile modal');
  }
}

function onPhoneCompleted(payload: { phone: string }) {
  console.info('[mine] phone bound, phone=', payload.phone.slice(0, 3) + '****');
  uni.showToast({ title: '手机号绑定成功', icon: 'success' });
}

function onGoAddress() {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/address-manage/index' });
  console.info('[mine] go address-manage');
}

function onGoComplaintList() {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/complaint-list/index' });
  console.info('[mine] go complaint-list');
}

function onNotification() {
  uni.showToast({ title: '消息通知功能即将上线', icon: 'none' });
  console.info('[mine] notification placeholder');
}

function onCallService() {
  uni.makePhoneCall({ phoneNumber: CUSTOMER_SERVICE_PHONE });
  console.info('[mine] call service phone');
}

function onServiceAgreement() {
  uni.showToast({ title: '服务协议功能即将上线', icon: 'none' });
  console.info('[mine] service agreement placeholder');
}

function onViewPrivacy() {
  privacyModalRef.value?.show();
  console.info('[mine] view privacy modal');
}

function onPrivacyReAgreed() {
  uni.showToast({ title: '感谢您的确认', icon: 'success' });
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) {
        authStore.logout();
        console.info('[mine] user logged out');
        uni.switchTab({ url: '/pages/index/index' });
      }
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f0f5ff;
}

/* 用户信息卡片 */
.user-card {
  background: linear-gradient(135deg, #e8f1ff 0%, #f0f5ff 100%);
  padding: 60rpx 40rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #c8d8f0;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.15);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.phone-number {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
  letter-spacing: 2rpx;
}

.phone-hint {
  font-size: 24rpx;
  color: #1677ff;
  margin-top: 6rpx;
}

/* 菜单组 */
.menu-group {
  background-color: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  margin: 24rpx 24rpx 0;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.menu-icon-emoji {
  font-size: 32rpx;
  width: 40rpx;
  text-align: center;
}

.menu-label {
  font-size: 28rpx;
  color: #333;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.agreed-tag {
  font-size: 22rpx;
  color: #07c160;
  background-color: #f0faf4;
  border: 1rpx solid #b7ebd0;
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
  line-height: 1.4;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
  line-height: 1;
}

/* 退出登录 */
.logout-wrap {
  margin: 40rpx 24rpx 0;
}

.btn-logout {
  width: 100%;
  height: 88rpx;
  background: #ffffff;
  color: #ff4d4f;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: 1rpx solid #ffd6d6;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(255, 77, 79, 0.08);
}
</style>
