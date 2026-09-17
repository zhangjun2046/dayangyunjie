<template>
  <view class="page">
    <uni-nav-bar status-bar title="绑定微信" left-icon="left" :border="false" @clickLeft="onBack" />

    <view class="card">
      <text class="status">{{ statusText }}</text>
      <text class="hint">
        请用微信打开本页。关注服务号「北京大洋云洁」后点下方按钮完成授权，即可收到保洁 / 废品订单的服务号通知。家政咨询单不发通知。未关注也可以先绑定。
      </text>
      <button class="btn" :disabled="loading" @tap="onBind">
        {{ loading ? '跳转中…' : bindButtonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { fetchAdminWechatBind, fetchAdminWechatOauthUrl } from '@/api/auth';
import { ensureAuthed } from '@/composables/useRouteGuard';

const loading = ref(false);
const bound = ref(false);
const subscribed = ref<boolean | null>(null);
const oauthResult = ref<'ok' | 'error' | ''>('');
const oauthReason = ref('');

const statusText = computed(() => {
  if (oauthResult.value === 'ok') {
    return subscribed.value === false
      ? '已绑定。请关注服务号后即可收到微信通知。'
      : '已绑定微信，可接收服务号通知。';
  }
  if (oauthResult.value === 'error') {
    return oauthReasonLabel(oauthReason.value);
  }
  if (bound.value) {
    return subscribed.value === false
      ? '已绑定，尚未关注服务号，微信通知会跳过。'
      : '已绑定微信。';
  }
  return '尚未绑定服务号。';
});

const bindButtonText = computed(() => (bound.value ? '重新绑定' : '在微信中授权绑定'));

function oauthReasonLabel(reason: string): string {
  if (reason === 'expired' || reason === 'used' || reason === 'invalid_state') {
    return '授权已过期，请重新点绑定。';
  }
  if (reason === 'conflict') {
    return '该微信已绑定其他运营账号。';
  }
  if (reason === 'oauth_failed' || reason === 'missing_code') {
    return '微信授权失败，请在微信内重试。';
  }
  return '绑定未完成，请重试。';
}

function isWechatBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /MicroMessenger/i.test(navigator.userAgent);
}

onLoad((query) => {
  const status = String(query?.status ?? '');
  if (status === 'ok' || status === 'error') {
    oauthResult.value = status;
    oauthReason.value = String(query?.reason ?? '');
  }
});

onShow(async () => {
  const ok = await ensureAuthed();
  if (!ok) {
    return;
  }
  try {
    const data = await fetchAdminWechatBind();
    bound.value = data.bound;
    subscribed.value = data.subscribed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '查询绑定状态失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
});

function onBack() {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/orders/index' });
    },
  });
}

async function onBind() {
  if (!isWechatBrowser()) {
    uni.showToast({ title: '请用微信打开本页', icon: 'none', duration: 2000 });
    return;
  }
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await fetchAdminWechatOauthUrl();
    if (!data.url) {
      throw new Error('未返回授权地址');
    }
    // #ifdef H5
    window.location.href = data.url;
    // #endif
  } catch (err) {
    const msg = err instanceof Error ? err.message : '无法开始绑定';
    uni.showToast({ title: msg, icon: 'none', duration: 2000 });
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8faff;
}

.card {
  margin: 32rpx;
  padding: 40rpx 32rpx;
  background: #fff;
  border-radius: 16rpx;
}

.status {
  display: block;
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.btn {
  margin-top: 48rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  color: #fff;
  font-size: 30rpx;
  border: none;
}

.btn::after {
  border: none;
}
</style>
