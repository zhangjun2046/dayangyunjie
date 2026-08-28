<template>
  <view class="page">
    <view v-if="checkingSession" class="checking-wrap">
      <text class="checking-text">正在验证登录状态…</text>
    </view>

    <template v-else>
      <image class="bg-image" src="/static/icons/bg_denglu_n.png" mode="aspectFill" />

      <view class="form-wrap">
        <view class="input-card">
          <input
            v-model="email"
            class="input-field"
            type="text"
            maxlength="128"
            placeholder="请输入邮箱"
            placeholder-class="input-placeholder"
            confirm-type="next"
          />
        </view>

        <view class="input-card" style="margin-top: 46rpx;">
          <input
            v-model="password"
            class="input-field"
            :password="!showPassword"
            placeholder="请输入密码"
            placeholder-class="input-placeholder"
            confirm-type="done"
            @confirm="onLogin"
          />
          <view class="pwd-toggle" @tap.stop="showPassword = !showPassword">
            <uni-icons :type="showPassword ? 'eye' : 'eye-slash'" size="22" color="#999999" />
          </view>
        </view>

        <button
          class="btn-login"
          :class="{ 'btn-login--loading': loading }"
          :disabled="loading"
          @tap="onLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <view class="forgot-hint" @tap="onForgotPassword">
          忘记密码？请联系超级管理员重置
        </view>
      </view>

      <view class="agreement-bar">
        <view class="agreement-inner" @tap="toggleAgreement">
          <image
            class="checkbox-img"
            :src="agreed ? '/static/icons/radio-checked.png' : '/static/icons/radio-unchecked.png'"
            mode="aspectFit"
          />
          <text class="agreement-text">我已阅读并同意</text>
          <text class="agreement-link" @tap.stop="onViewAgreement('user')">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link" @tap.stop="onViewAgreement('privacy')">《隐私政策》</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminLogin } from '@/api/auth';
import { useAuthStore, STORAGE_KEY } from '@/store/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasPersistedSession(): boolean {
  try {
    return !!uni.getStorageSync(STORAGE_KEY);
  } catch {
    return false;
  }
}

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const agreed = ref(true);
const loading = ref(false);
const checkingSession = ref(hasPersistedSession());

const authStore = useAuthStore();

onShow(async () => {
  if (!hasPersistedSession() && !authStore.isLoggedIn) {
    checkingSession.value = false;
    return;
  }
  checkingSession.value = true;
  try {
    const ok = await authStore.ensureSession();
    if (ok) {
      console.info('[login] local session valid, go orders');
      uni.reLaunch({ url: '/pages/orders/index' });
      return;
    }
  } finally {
    checkingSession.value = false;
  }
});

function toggleAgreement() {
  agreed.value = !agreed.value;
}

function onViewAgreement(type: 'user' | 'privacy') {
  uni.navigateTo({ url: `/pages/agreement/index?tab=${type}` });
}

function onForgotPassword() {
  uni.showToast({ title: '请联系超级管理员重置密码', icon: 'none', duration: 2000 });
}

async function onLogin() {
  const emailVal = email.value.trim();
  const passwordVal = password.value;

  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none', duration: 1500 });
    return;
  }

  if (!EMAIL_RE.test(emailVal)) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none', duration: 1500 });
    return;
  }

  if (!passwordVal) {
    uni.showToast({ title: '请输入密码', icon: 'none', duration: 1500 });
    return;
  }

  loading.value = true;
  try {
    console.info('[login] attempting admin login, email=', emailVal);
    const result = await adminLogin(emailVal, passwordVal);
    authStore.login(result);
    await authStore.fetchPermissions();
    console.info('[login] success, adminId=', result.admin.id);
    uni.reLaunch({ url: '/pages/orders/index' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '登录失败，请重试';
    uni.showToast({ title: msg, icon: 'none', duration: 2000 });
    console.info('[login] failed:', msg);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.checking-wrap {
  flex: 1;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checking-text {
  font-size: 28rpx;
  color: #999;
}

.bg-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100vh;
  z-index: 0;
}

.form-wrap {
  position: relative;
  z-index: 1;
  margin-top: 380rpx;
  padding: 0 48rpx;
}

.input-card {
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(22, 119, 255, 0.08);
  padding: 0 32rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
}

.input-field {
  flex: 1;
  min-width: 0;
  height: 96rpx;
  font-size: 30rpx;
  color: #333333;
  background: transparent;
}

.pwd-toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  padding: 8rpx 0 8rpx 16rpx;
  min-width: 56rpx;
  min-height: 56rpx;
}

.input-placeholder {
  color: #b0b8c4;
  font-size: 30rpx;
}

.btn-login {
  margin-top: 56rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #246bff 0%, #1aa1ff 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.35);
}

.btn-login::after {
  border: none;
}

.btn-login--loading {
  opacity: 0.7;
}

.forgot-hint {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #236eff;
}

.agreement-bar {
  position: fixed;
  bottom: 60rpx;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0 48rpx;
}

.agreement-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
}

.checkbox-img {
  width: 36rpx;
  height: 36rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.agreement-text {
  font-size: 26rpx;
  color: #666666;
}

.agreement-link {
  font-size: 26rpx;
  color: #236eff;
}
</style>
