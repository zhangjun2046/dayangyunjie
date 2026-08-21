<template>
  <scroll-view class="page" scroll-y>
    <RemoteImage class="poster" :src="posterSrc" mode="widthFix" variant="poster" />
  </scroll-view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { decodeQueryUrl } from '@/utils/query-url';
import RemoteImage from '@/components/RemoteImage.vue';

/** 未传 img 参数（如旧 Banner 配置）时的兜底海报 */
const DEFAULT_POSTER = 'http://118.195.149.50/uploads/IMG_1787122367832_E23IW5.jpg';

/** 广告详情图，可由后台 Banner 的跳转路径经 img 参数指定 */
const posterSrc = ref(DEFAULT_POSTER);

onLoad((options?: Record<string, string>) => {
  const img = decodeQueryUrl(options?.img);
  if (img) {
    posterSrc.value = img;
  }
  console.info('[cleaning-ad-detail] page loaded, poster=', posterSrc.value);
});
</script>

<style scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #ffffff;
}

.poster {
  width: 100%;
  display: block;
}
</style>
