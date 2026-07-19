<template>
  <view v-if="visible" class="success-overlay">
    <view class="success-card">
      <image class="success-img" src="/static/icons/booking-success.png" mode="aspectFit" />
      <text class="success-title">{{ title }}</text>
      <text v-if="orderNo" class="success-order-no">{{ orderNo }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
const title = ref('预约成功');
const orderNo = ref('');

/** 显示预约/提交成功提示卡，替代纯文字 Toast，配合居民端设计稿插画使用 */
function show(opts: { title?: string; orderNo?: string } = {}) {
  title.value = opts.title || '预约成功';
  orderNo.value = opts.orderNo || '';
  visible.value = true;
}

function hide() {
  visible.value = false;
}

defineExpose({ show, hide });
</script>

<style scoped>
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.success-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 480rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.success-img {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
}

.success-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.success-order-no {
  font-size: 26rpx;
  color: #999;
}
</style>
