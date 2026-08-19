<template>
  <view class="timeline">
    <view
      v-for="(node, index) in nodes"
      :key="node.status"
      class="timeline-item"
      :class="{ 'is-active': node.active, 'is-done': node.done, 'is-last': index === nodes.length - 1 }"
    >
      <!-- 节点圆圈：已完成用固定图片，当前/未到仍用圆点 -->
      <view class="timeline-dot-wrap">
        <image
          v-if="node.done"
          class="timeline-dot-img"
          src="/static/icons/radio-checked.png"
          mode="aspectFit"
        />
        <view
          v-else
          class="timeline-dot"
          :class="{ 'dot-active': node.active }"
        />
        <view v-if="index < nodes.length - 1" class="timeline-line" :class="{ 'line-done': node.done }" />
      </view>
      <!-- 节点内容 -->
      <view class="timeline-content">
        <text class="node-label" :class="{ 'label-active': node.active }">{{ node.label }}</text>
        <text v-if="node.time" class="node-time">{{ node.time }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/** 订单类型 */
type OrderType = 'CLEANING' | 'RECYCLING' | 'CONSULT';

interface Props {
  /** 当前订单状态（后端枚举值） */
  status: string;
  /** 订单类型，决定时间轴节点组成 */
  orderType: OrderType;
}

const props = defineProps<Props>();

/** 保洁/废品订单节点定义（状态映射到居民端展示名） */
const ORDER_NODES_MAIN: Array<{ status: string; label: string }> = [
  { status: 'PENDING_ASSIGN', label: '已下单' },
  { status: 'ASSIGNED', label: '待服务' },
  { status: 'ACCEPTED', label: '已接单' },
  { status: 'IN_SERVICE', label: '服务中' },
  { status: 'PENDING_REVIEW', label: '待评价' },
  { status: 'REVIEWED', label: '已评价' },
];

/** 取消状态独立节点 */
const NODE_CANCELLED = { status: 'CANCELLED', label: '已取消' };

/** 家政咨询订单节点 */
const ORDER_NODES_CONSULT: Array<{ status: string; label: string }> = [
  { status: 'FOLLOW_UP', label: '待跟进' },
  { status: 'FOLLOWING', label: '跟进中' },
  { status: 'COMPLETED', label: '已完成' },
];

/** 状态顺序映射（保洁/废品） */
const STATUS_ORDER_MAIN: Record<string, number> = {
  PENDING_ASSIGN: 0,
  ASSIGNED: 1,
  ACCEPTED: 2,
  IN_SERVICE: 3,
  PENDING_REVIEW: 4,
  REVIEWED: 5,
  CANCELLED: -1,
};

/** 状态顺序映射（家政咨询） */
const STATUS_ORDER_CONSULT: Record<string, number> = {
  FOLLOW_UP: 0,
  FOLLOWING: 1,
  COMPLETED: 2,
};

interface TimelineNode {
  status: string;
  label: string;
  active: boolean;
  done: boolean;
  time?: string;
}

const nodes = computed<TimelineNode[]>(() => {
  const currentStatus = props.status;

  if (props.orderType === 'CONSULT') {
    const currentIdx = STATUS_ORDER_CONSULT[currentStatus] ?? -1;
    return ORDER_NODES_CONSULT.map((node, idx) => ({
      ...node,
      active: idx === currentIdx,
      done: idx < currentIdx,
    }));
  }

  // 取消状态：只展示「已下单」和「已取消」两个节点
  if (currentStatus === 'CANCELLED') {
    return [
      { status: 'PENDING_ASSIGN', label: '已下单', active: false, done: true },
      { ...NODE_CANCELLED, active: true, done: false },
    ];
  }

  const currentIdx = STATUS_ORDER_MAIN[currentStatus] ?? -1;
  return ORDER_NODES_MAIN.map((node, idx) => ({
    ...node,
    active: idx === currentIdx,
    done: idx < currentIdx,
  }));
});
</script>

<style scoped>
.timeline {
  padding: 24rpx 0;
}

.timeline-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  min-height: 80rpx;
}

.timeline-dot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 36rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #d9d9d9;
  border: 2rpx solid #d9d9d9;
  margin-top: 4rpx;
}

.dot-active {
  background: #236EFF;
  border-color: #236EFF;
  width: 24rpx;
  height: 24rpx;
}

.timeline-dot-img {
  width: 28rpx;
  height: 28rpx;
  margin-top: 2rpx;
  flex-shrink: 0;
}

.timeline-line {
  width: 2rpx;
  flex: 1;
  min-height: 52rpx;
  background: #d9d9d9;
  margin-top: 4rpx;
}

.line-done {
  background: #236EFF;
}

.timeline-content {
  flex: 1;
  padding-bottom: 20rpx;
}

.node-label {
  font-size: 28rpx;
  color: #999;
  line-height: 1.4;
}

.label-active {
  color: #236EFF;
  font-weight: 600;
  font-size: 30rpx;
}

.node-time {
  display: block;
  font-size: 24rpx;
  color: #bbb;
  margin-top: 4rpx;
}
</style>
