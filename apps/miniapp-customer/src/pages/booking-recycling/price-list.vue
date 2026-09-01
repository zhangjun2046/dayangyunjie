<template>
  <view class="price-list-page">
    <view v-if="loading" class="empty-tip">
      <text>加载中...</text>
    </view>
    <view v-else-if="items.length === 0" class="empty-tip">
      <text>暂无报价</text>
    </view>
    <view v-else class="list-card">
      <view v-for="item in items" :key="item.id" class="price-row">
        <view class="price-left">
          <image
            v-if="itemIconSrc(item)"
            class="price-icon"
            :src="itemIconSrc(item)!"
            mode="aspectFit"
            @error="onItemIconError(item)"
          />
          <view v-else class="price-icon-fallback">
            <text>{{ itemNameInitial(item.name) }}</text>
          </view>
          <text class="price-name">{{ item.name }}</text>
        </view>
        <text class="price-text">{{ item.priceText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { RecyclingItemDto } from '@dayangyunjie/shared';
import { fetchEnabledRecyclingItems } from '@/api/recycling-item';
import { useBookingRecyclingStore } from '@/store/booking-recycling';
import { itemNameInitial } from './booking-recycling.utils';

const store = useBookingRecyclingStore();
const loading = ref(false);
const items = ref<RecyclingItemDto[]>([]);
const failedIconIds = ref<Set<number>>(new Set());

function itemIconSrc(item: RecyclingItemDto): string | null {
  const icon = item.icon?.trim();
  if (!icon || failedIconIds.value.has(item.id)) return null;
  return icon;
}

function onItemIconError(item: RecyclingItemDto) {
  if (failedIconIds.value.has(item.id)) return;
  failedIconIds.value = new Set([...failedIconIds.value, item.id]);
}

async function loadItems(catalogId: number) {
  loading.value = true;
  try {
    items.value = await fetchEnabledRecyclingItems(catalogId);
  } catch (error) {
    console.info('[recycling-price-list] load failed', error);
    uni.showToast({ title: '报价加载失败', icon: 'none' });
    items.value = [];
  } finally {
    loading.value = false;
  }
}

onLoad((query?: Record<string, string>) => {
  const fromQuery = Number(query?.catalogId);
  const catalogId = Number.isInteger(fromQuery) && fromQuery > 0
    ? fromQuery
    : store.selectedCatalog?.id;
  if (!catalogId) {
    items.value = [];
    return;
  }
  loadItems(catalogId);
});
</script>

<style scoped>
.price-list-page {
  min-height: 100vh;
  background: #f8faff;
  padding: 24rpx;
  box-sizing: border-box;
}

.list-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.price-row:last-child {
  border-bottom: none;
}

.price-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-width: 0;
}

.price-icon,
.price-icon-fallback {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.price-icon-fallback {
  background: #f0f6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #236eff;
  font-size: 28rpx;
  font-weight: 600;
}

.price-name {
  font-size: 30rpx;
  color: #333;
}

.price-text {
  font-size: 28rpx;
  color: #236eff;
  flex-shrink: 0;
  margin-left: 24rpx;
}

.empty-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
