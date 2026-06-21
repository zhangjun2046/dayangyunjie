<template>
  <view class="page">
    <!-- 渐变背景装饰区 -->
    <view class="bg-gradient" />

    <!-- 表单区域 -->
    <view class="form-wrap">
      <view class="input-card">
        <input
          v-model="phone"
          class="input-field"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
          placeholder-class="input-placeholder"
          @input="onPhoneInput"
        />
      </view>

      <view class="input-card" style="margin-top: 24rpx;">
        <input
          v-model="password"
          class="input-field"
          :password="true"
          placeholder="请输入密码"
          placeholder-class="input-placeholder"
        />
      </view>

      <!-- 登录按钮 -->
      <button
        class="btn-login"
        :class="{ 'btn-login--loading': loading }"
        :disabled="loading"
        @tap="onLogin"
      >
        {{ loading ? '登录中...' : '开始服务' }}
      </button>

      <!-- 忘记密码提示 -->
      <view class="forgot-hint">忘记密码？请联系管理员重置</view>
    </view>

    <!-- 底部协议区 -->
    <view class="agreement-bar">
      <view class="agreement-inner" @tap="toggleAgreement">
        <view class="checkbox" :class="{ 'checkbox--checked': agreed }">
          <text v-if="agreed" class="checkbox-icon">✓</text>
        </view>
        <text class="agreement-text">我已阅读并同意</text>
        <text class="agreement-link" @tap.stop="onViewAgreement('user')">《用户协议》</text>
        <text class="agreement-text">和</text>
        <text class="agreement-link" @tap.stop="onViewAgreement('privacy')">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { workerLogin } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

const phone = ref('');
const password = ref('');
const agreed = ref(false);
const loading = ref(false);

const authStore = useAuthStore();

function onPhoneInput(e: { detail: { value: string } }) {
  // 只保留数字
  phone.value = e.detail.value.replace(/\D/g, '').slice(0, 11);
}

function toggleAgreement() {
  agreed.value = !agreed.value;
}

function onViewAgreement(type: 'user' | 'privacy') {
  const title = type === 'user' ? '用户协议' : '隐私政策';
  uni.showModal({
    title,
    content: '协议内容将在后续版本完善，敬请期待。',
    showCancel: false,
    confirmText: '我知道了',
  });
}

async function onLogin() {
  const phoneVal = phone.value.trim();
  const passwordVal = password.value;

  // 协议校验
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none', duration: 1500 });
    return;
  }

  // 手机号格式校验
  if (!/^1\d{10}$/.test(phoneVal)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none', duration: 1500 });
    return;
  }

  // 密码非空校验
  if (!passwordVal) {
    uni.showToast({ title: '请输入密码', icon: 'none', duration: 1500 });
    return;
  }

  loading.value = true;
  try {
    console.info('[login] attempting worker login, phone=', phoneVal.slice(0, 3) + '****');
    const result = await workerLogin(phoneVal, passwordVal);
    authStore.login(result);
    console.info('[login] success, workerId=', result.worker.id);
    // 登录成功后跳转到首页 Tab
    uni.switchTab({ url: '/pages/index/index' });
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
  background: linear-gradient(180deg, #ddeeff 0%, #eef5ff 40%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 顶部渐变装饰弧形 */
.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 480rpx;
  background: linear-gradient(160deg, #c8e0ff 0%, #ddeeff 50%, transparent 100%);
  border-radius: 0 0 50% 50% / 0 0 80rpx 80rpx;
  z-index: 0;
}

/* 表单区域：垂直居中偏上 */
.form-wrap {
  position: relative;
  z-index: 1;
  margin-top: 280rpx;
  padding: 0 48rpx;
}

/* 白色卡片输入框 */
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
  height: 96rpx;
  font-size: 30rpx;
  color: #333333;
  background: transparent;
}

.input-placeholder {
  color: #b0b8c4;
  font-size: 30rpx;
}

/* 登录按钮 */
.btn-login {
  margin-top: 56rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #1677ff 0%, #36a3ff 100%);
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

/* 忘记密码提示 */
.forgot-hint {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9aa3af;
}

/* 底部协议栏 */
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

/* 自定义勾选框 */
.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #1677ff;
  background: #ffffff;
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox--checked {
  background: #1677ff;
  border-color: #1677ff;
}

.checkbox-icon {
  font-size: 24rpx;
  color: #ffffff;
  line-height: 1;
}

.agreement-text {
  font-size: 26rpx;
  color: #666666;
}

.agreement-link {
  font-size: 26rpx;
  color: #1677ff;
}
</style>
