<template>
  <view class="page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <image
        class="avatar"
        :src="resident?.avatar || defaultAvatar"
        mode="aspectFill"
      />
      <view class="user-info">
        <text class="nickname">{{ displayName }}</text>
        <text class="openid" v-if="resident">ID: {{ resident.id }}</text>
        <text class="login-hint" v-else>未登录</text>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <view class="menu-item" @tap="onViewPrivacy">
        <text class="menu-label">用户隐私协议</text>
        <view class="menu-right">
          <text v-if="hasAgreedPrivacy" class="agreed-tag">已同意</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      <view class="menu-item" @tap="onLogout" v-if="isLoggedIn">
        <text class="menu-label logout">退出登录</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 隐私协议弹窗（再次查看） -->
    <PrivacyModal ref="privacyModalRef" @agreed="onPrivacyReAgreed" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import PrivacyModal from '@/components/PrivacyModal.vue';

const authStore = useAuthStore();
const privacyModalRef = ref<InstanceType<typeof PrivacyModal> | null>(null);

const resident = computed(() => authStore.resident);
const isLoggedIn = computed(() => authStore.isLoggedIn);
const hasAgreedPrivacy = computed(() => authStore.hasAgreedPrivacy);
const displayName = computed(() => resident.value?.nickname || '居民用户');
const defaultAvatar = '/static/images/default-avatar.png';

function onViewPrivacy() {
  privacyModalRef.value?.show();
  console.info('[mine] view privacy modal');
}

function onPrivacyReAgreed() {
  // 再次查看后点同意，无需重新执行登录
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
  padding: 24rpx;
  min-height: 100vh;
}

.user-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: #e8f1ff;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nickname {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.openid {
  font-size: 24rpx;
  color: #aaa;
}

.login-hint {
  font-size: 26rpx;
  color: #999;
}

.menu-list {
  background-color: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
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

.menu-label {
  font-size: 28rpx;
  color: #333;
}

.menu-label.logout {
  color: #ff4d4f;
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
</style>
