<template>
  <scroll-view class="price-list-page" scroll-y>
    <view v-if="loading" class="empty-tip">
      <text>加载中...</text>
    </view>
    <RemoteImage
      v-else-if="posterSrc"
      class="poster"
      :src="posterSrc"
      mode="widthFix"
      variant="poster"
    />
    <view v-else class="empty-tip">
      <text>暂无报价</text>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { fetchServiceCatalog } from '@/api/service-catalog';
import { useBookingRecyclingStore } from '@/store/booking-recycling';
import RemoteImage from '@/components/RemoteImage.vue';

const store = useBookingRecyclingStore();
const loading = ref(false);
const posterSrc = ref('');

async function loadPoster(catalogId: number) {
  loading.value = true;
  try {
    const catalog = await fetchServiceCatalog(catalogId);
    posterSrc.value = catalog.priceImageUrl?.trim() || '';
  } catch (error) {
    console.info('[recycling-price-list] load failed', error);
    uni.showToast({ title: '报价加载失败', icon: 'none' });
    posterSrc.value = '';
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
    posterSrc.value = '';
    return;
  }
  loadPoster(catalogId);
});
</script>

<style scoped>
.price-list-page {
  width: 100%;
  height: 100vh;
  background: #ffffff;
}

.poster {
  width: 100%;
  display: block;
}

.empty-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
</style>
