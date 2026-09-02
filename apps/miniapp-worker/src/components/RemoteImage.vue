<template>
  <image
    v-if="displaySrc"
    :class="['remote-image', variant && `remote-image--${variant}`]"
    :src="displaySrc"
    :mode="mode"
    @error="onError"
    @tap="onTap"
  />
</template>

<script lang="ts">
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared',
  },
};
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { needsLocalFetch, resolveDisplayImage } from '@/utils/remote-image';

const props = withDefaults(
  defineProps<{
    src?: string;
    mode?: string;
    variant?: 'banner' | 'avatar' | 'thumbnail' | 'evidence' | 'poster';
  }>(),
  {
    src: '',
    mode: 'aspectFill',
    variant: undefined,
  },
);

const emit = defineEmits<{
  tap: [];
  error: [];
}>();

/** 需转本地的 http/IP 图先不赋给 <image>，避免体验版立刻 fetching image fail */
const displaySrc = ref('');

watch(
  () => props.src,
  async (url) => {
    if (!url) {
      displaySrc.value = '';
      return;
    }
    if (!needsLocalFetch(url)) {
      displaySrc.value = url;
      return;
    }
    displaySrc.value = '';
    try {
      displaySrc.value = await resolveDisplayImage(url);
    } catch (e) {
      console.info('[RemoteImage] load failed', url, e);
      emit('error');
    }
  },
  { immediate: true },
);

function onError() {
  console.info('[RemoteImage] image error', displaySrc.value);
  emit('error');
}

function onTap() {
  emit('tap');
}
</script>

<style scoped>
.remote-image--banner {
  width: 100%;
  height: 100%;
  border-radius: 30rpx;
}

.remote-image--avatar {
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  background-color: #c8d8f0;
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.15);
}

.remote-image--thumbnail {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.remote-image--evidence {
  width: 196rpx;
  height: 196rpx;
  border-radius: 16rpx;
  background-color: #f5f5f5;
}

.remote-image--poster {
  display: block;
  width: 100%;
}
</style>
