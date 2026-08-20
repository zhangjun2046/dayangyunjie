<template>
  <view class="timeline">
    <view
      v-for="(node, index) in progress"
      :key="node.status"
      class="timeline-item"
      :class="{
        'is-active': node.state === 'current',
        'is-done': node.state === 'done',
        'is-last': index === progress.length - 1,
      }"
    >
      <!-- 节点圆圈：已完成为蓝底白勾，取消为红底白叉，未到达为空心灰圈 -->
      <view class="timeline-dot-wrap">
        <view v-if="node.status === 'CANCELLED'" class="timeline-dot-cancelled">
          <text class="cancel-cross-text">X</text>
        </view>
        <image
          v-else-if="
            node.state === 'done' ||
            node.state === 'current'
          "
          class="timeline-dot-img"
          src="/static/icons/radio-checked.png"
          mode="aspectFit"
        />
        <view
          v-else
          class="timeline-dot"
        />
        <view
          v-if="index < progress.length - 1"
          class="timeline-line"
        />
      </view>
      <!-- 节点内容 -->
      <view class="timeline-content">
        <text
          class="node-label"
          :class="{
            'label-active': node.state === 'current',
            'label-cancelled': node.status === 'CANCELLED',
          }"
        >
          {{ node.label }}
        </text>
        <text v-if="node.message" class="node-message">{{ node.message }}</text>
        <text v-if="node.operatedAt" class="node-time">{{ formatTime(node.operatedAt) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProgressNodeDto } from '@dayangyunjie/shared';

interface Props {
  progress: ProgressNodeDto[];
}

defineProps<Props>();

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${beijing.getUTCFullYear()}-${pad(beijing.getUTCMonth() + 1)}-${pad(beijing.getUTCDate())} ${pad(beijing.getUTCHours())}:${pad(beijing.getUTCMinutes())}:${pad(beijing.getUTCSeconds())}`;
}
</script>

<style scoped>
.timeline {
  padding: 32rpx 0 8rpx;
}

.timeline-item {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 124rpx;
}

.timeline-item.is-last {
  min-height: auto;
}

.timeline-dot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40rpx;
  margin-right: 28rpx;
  flex-shrink: 0;
}

.timeline-dot {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  box-sizing: border-box;
  background: #ffffff;
  border: 3rpx solid #d8dde5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-dot-img {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
}

.timeline-dot-cancelled {
  position: relative;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-cross-text {
  color: #ffffff;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1;
}

.timeline-line {
  width: 2rpx;
  flex: 1;
  min-height: 64rpx;
  background: #e1e5eb;
}

.timeline-content {
  flex: 1;
  padding-bottom: 42rpx;
  min-width: 0;
}

.timeline-item.is-last .timeline-content {
  padding-bottom: 0;
}

.node-label {
  display: block;
  font-size: 30rpx;
  color: #25282d;
  line-height: 1.4;
  font-weight: 600;
}

.label-active {
  color: #25282d;
}

.label-cancelled {
  color: #f56c6c;
}

.node-time {
  display: block;
  font-size: 24rpx;
  color: #7d838c;
  margin-top: 6rpx;
}

.node-message {
  display: block;
  margin-top: 8rpx;
  color: #737982;
  font-size: 26rpx;
  line-height: 1.5;
}
</style>
