<template>
  <view class="page">
    <uni-card title="大洋云洁" extra="员工端" :is-shadow="true">
      <text class="desc">员工工作台 · P1.4 骨架页</text>
    </uni-card>
    <view class="hint">底部可切换：首页 / 任务 / 我的</view>
  </view>
</template>

<script setup lang="ts">
console.info('[miniapp-worker] home page loaded');
</script>

<style scoped>
.page {
  padding: 24rpx;
}

.desc {
  font-size: 28rpx;
  color: #666;
}

.hint {
  margin-top: 32rpx;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}
</style>
