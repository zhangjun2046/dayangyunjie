<template>
  <view v-if="visible" class="mask" @tap="onCancel" @touchmove.stop.prevent>
    <view class="sheet" @tap.stop>
      <view class="sheet-header">
        <text class="sheet-title">{{ title }}</text>
        <text class="sheet-close" @tap="onCancel">关闭</text>
      </view>

      <view v-if="loading" class="sheet-status">
        <view class="loading-spinner" />
        <text class="status-text">加载可选人员…</text>
      </view>

      <view v-else-if="candidates.length === 0" class="sheet-status">
        <text class="status-text">暂无空闲且技能匹配的服务人员</text>
      </view>

      <scroll-view v-else class="worker-scroll" scroll-y>
        <view
          v-for="worker in candidates"
          :key="worker.id"
          :class="['worker-row', selectedId === worker.id && 'worker-row--active']"
          @tap="selectedId = worker.id"
        >
          <image
            class="radio-icon"
            :src="selectedId === worker.id ? '/static/icons/radio-checked.png' : '/static/icons/radio-unchecked.png'"
            mode="aspectFit"
          />
          <view class="worker-main">
            <view class="worker-top">
              <text class="worker-name">{{ worker.name }}</text>
              <text class="worker-skill">{{ skillLabel(worker.skillType) }}</text>
            </view>
            <view class="worker-meta">
              <text class="meta-item">{{ worker.status === 'IDLE' ? '空闲' : '服务中' }}</text>
              <text class="meta-item">今日完成 {{ worker.todayOrders ?? 0 }}</text>
              <text class="meta-item">评分 {{ formatRating(worker.rating) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="sheet-footer">
        <button class="btn btn-ghost" @tap="onCancel">取消</button>
        <button class="btn btn-primary" :disabled="!selectedId || submitting" @tap="onConfirm">
          {{ submitting ? '提交中…' : '确定' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/store/auth';
import { fetchWorkers } from '@/api/worker';
import type { WorkerListItem } from '@/api/worker';
import { assignCleaningOrder, reassignCleaningOrder } from '@/api/cleaning';
import { assignRecyclingOrder, reassignRecyclingOrder } from '@/api/recycling';
import { filterAssignableWorkers, skillLabel, type OrderSkillType } from '@/utils/worker-skill';

const props = defineProps<{
  visible: boolean;
  orderId: number;
  orderType: 'cleaning' | 'recycling';
  mode: 'assign' | 'reassign';
  currentWorkerId?: number | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

const MENU_KEY: Record<'cleaning' | 'recycling', string> = {
  cleaning: 'orders.cleaning',
  recycling: 'orders.recycling',
};

const authStore = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const selectedId = ref<number | null>(null);
const candidates = ref<WorkerListItem[]>([]);

const title = computed(() =>
  props.mode === 'reassign' ? '改派服务人员' : '分配服务人员',
);

const orderSkillType = computed<OrderSkillType>(() =>
  props.orderType === 'recycling' ? 'RECYCLING' : 'CLEANING',
);

watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    selectedId.value = null;
    candidates.value = [];
    const allowed = await ensureTypePermission();
    if (!allowed) {
      closeWithNoPermission();
      return;
    }
    await loadCandidates();
  },
);

async function ensureTypePermission(): Promise<boolean> {
  await authStore.refreshPermissions();
  return authStore.hasMenu(MENU_KEY[props.orderType]);
}

function closeWithNoPermission(): void {
  emit('update:visible', false);
  uni.showToast({ title: '没有权限', icon: 'none' });
}

async function loadCandidates(): Promise<void> {
  loading.value = true;
  try {
    const res = await fetchWorkers(100);
    let list = filterAssignableWorkers(res.items ?? [], orderSkillType.value);
    if (props.mode === 'reassign' && props.currentWorkerId) {
      list = list.filter((w) => w.id !== props.currentWorkerId);
    }
    candidates.value = list;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    candidates.value = [];
  } finally {
    loading.value = false;
  }
}

function formatRating(rating?: number): string {
  if (rating == null || Number.isNaN(rating)) return '—';
  return rating.toFixed(1);
}

function onCancel(): void {
  emit('update:visible', false);
}

async function onConfirm(): Promise<void> {
  if (!selectedId.value || submitting.value) return;

  const allowed = await ensureTypePermission();
  if (!allowed) {
    closeWithNoPermission();
    return;
  }

  const operatorId = authStore.admin?.id;
  if (!operatorId) {
    uni.showToast({ title: '登录状态异常', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    if (props.orderType === 'cleaning') {
      if (props.mode === 'reassign') {
        await reassignCleaningOrder(props.orderId, selectedId.value, operatorId);
      } else {
        await assignCleaningOrder(props.orderId, selectedId.value, operatorId);
      }
    } else if (props.mode === 'reassign') {
      await reassignRecyclingOrder(props.orderId, selectedId.value, operatorId);
    } else {
      await assignRecyclingOrder(props.orderId, selectedId.value, operatorId);
    }

    emit('update:visible', false);
    uni.showToast({
      title: props.mode === 'reassign' ? '改派成功' : '分配成功',
      icon: 'success',
    });
    emit('success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '操作失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  z-index: 1000;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-height: 78vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.sheet-close {
  font-size: 26rpx;
  color: #999;
}

.sheet-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  gap: 16rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 5rpx solid #e8ecf0;
  border-top-color: #236eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-text {
  font-size: 26rpx;
  color: #999;
}

.worker-scroll {
  max-height: 52vh;
  padding: 0 24rpx;
}

.worker-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #f2f4f7;
}

.worker-row--active {
  background: #f5f9ff;
}

.radio-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.worker-main {
  flex: 1;
  min-width: 0;
}

.worker-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.worker-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.worker-skill {
  font-size: 22rpx;
  color: #236eff;
  background: #eef4ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.worker-meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 20rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #888;
}

.sheet-footer {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  padding: 20rpx 32rpx 28rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  margin: 0;
  padding: 0;
}

.btn::after {
  display: none;
}

.btn-ghost {
  background: #f5f7fa;
  color: #666;
}

.btn-primary {
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  color: #fff;
  border: none;
}

.btn-primary[disabled] {
  opacity: 0.5;
}
</style>
