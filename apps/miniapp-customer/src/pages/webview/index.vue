<template>
  <web-view v-if="src" :src="src" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { decodeQueryUrl } from '@/utils/query-url';

const src = ref('');

onLoad((query) => {
  src.value = decodeQueryUrl(query?.url);
  console.info('[webview] loaded, src=', src.value);
  if (!src.value) {
    uni.showToast({ title: '链接无效', icon: 'none' });
  }
});
</script>
