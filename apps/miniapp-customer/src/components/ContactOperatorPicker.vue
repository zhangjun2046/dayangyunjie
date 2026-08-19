<template>
  <view v-if="visible" class="overlay" @tap="close">
    <view class="sheet" @tap.stop>
      <view class="sheet-header">
        <view class="sheet-title-row">
          <text class="sheet-title">选择联系人</text>
          <view class="sheet-close" @tap="close">
            <text class="sheet-close-icon">×</text>
          </view>
        </view>
        <text class="sheet-sub">请选择要拨打的客服电话</text>
      </view>

      <scroll-view class="sheet-list" scroll-y>
        <view
          v-for="item in items"
          :key="item.id"
          class="contact-row"
          @tap="onSelect(item)"
        >
          <view class="contact-info">
            <text class="contact-name">{{ item.name || '客服' }}</text>
            <text class="contact-phone">{{ item.phone }}</text>
          </view>
          <text class="contact-action">拨打</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { OperatorDto } from '@/api/operator';
import { dialPhone } from '@/utils/call-contact-operator';

const visible = ref(false);
const items = ref<OperatorDto[]>([]);

function open(list: OperatorDto[]) {
  items.value = list;
  visible.value = true;
}

function close() {
  visible.value = false;
}

function onSelect(item: OperatorDto) {
  visible.value = false;
  dialPhone(item.phone);
  console.info('[ContactOperatorPicker] dial', item.name, item.phone);
}

defineExpose({ open, close });
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 32rpx 32rpx 24rpx;
  box-sizing: border-box;
}

.sheet-header {
  margin-bottom: 16rpx;
}

.sheet-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.sheet-close {
  width: 48rpx;
  height: 48rpx;
  margin-right: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-close-icon {
  font-size: 40rpx;
  line-height: 1;
  color: #9aa3af;
}

.sheet-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9aa3af;
}

.sheet-list {
  max-height: 520rpx;
}

.contact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 8rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.contact-row:last-child {
  border-bottom: none;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.contact-name {
  font-size: 30rpx;
  color: #111827;
  font-weight: 500;
}

.contact-phone {
  font-size: 26rpx;
  color: #6b7280;
}

.contact-action {
  flex-shrink: 0;
  margin-left: 24rpx;
  font-size: 28rpx;
  color: #246bff;
  font-weight: 500;
}
</style>
