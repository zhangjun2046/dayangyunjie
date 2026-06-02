<template>
  <view class="page">
    <view class="title">我的</view>
    <view class="shared-smoke">共享枚举示例：{{ pendingAssignLabel }}</view>
  </view>
</template>

<script setup lang="ts">
import { pendingAssignLabel } from '@/utils/shared-smoke';

console.info('[miniapp-worker] mine page loaded');
</script>

<style scoped>
.page {
  padding: 32rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.shared-smoke {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #1677ff;
}
</style>
