<template>
  <view class="page">
    <!-- 本地会话校验中：避免已登录时闪一下登录表单 -->
    <view v-if="checkingSession" class="checking-wrap">
      <text class="checking-text">正在验证登录状态…</text>
    </view>

    <template v-else>
      <!-- 全屏背景图 -->
      <image class="bg-image" src="/static/icons/bg_denglu_n.png" mode="aspectFill" />

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

        <view class="input-card" style="margin-top: 46rpx;">
          <input
            v-model="password"
            class="input-field"
            :password="!showPassword"
            placeholder="请输入密码"
            placeholder-class="input-placeholder"
          />
          <view class="pwd-toggle" @tap.stop="showPassword = !showPassword">
            <uni-icons :type="showPassword ? 'eye' : 'eye-slash'" size="22" color="#999999" />
          </view>
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

        <!-- 忘记密码提示：点击联系管理员 -->
        <view class="forgot-hint" @tap="onCallAdmin">
          忘记密码？请联系管理员重置
        </view>
      </view>

      <!-- 底部协议区 -->
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

      <ContactOperatorPicker ref="contactPickerRef" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { workerLogin } from '@/api/auth';
import { useAuthStore, STORAGE_KEY } from '@/store/auth';
import ContactOperatorPicker from '@/components/ContactOperatorPicker.vue';
import { callContactOperator } from '@/utils/call-contact-operator';

function hasPersistedSession(): boolean {
  try {
    return !!uni.getStorageSync(STORAGE_KEY);
  } catch {
    return false;
  }
}

const phone = ref('');
const password = ref('');
const showPassword = ref(false);
const agreed = ref(true);
const loading = ref(false);
// 无本地会话时直接展示登录表单，避免模拟器先看到一块空白
const checkingSession = ref(hasPersistedSession());
const contactPickerRef = ref<InstanceType<typeof ContactOperatorPicker> | null>(null);

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
      console.info('[login] local session valid, switch to tabs');
      uni.switchTab({ url: '/pages/index/index' });
      return;
    }
  } finally {
    checkingSession.value = false;
  }
});

function onPhoneInput(e: { detail: { value: string } }) {
  // 只保留数字
  phone.value = e.detail.value.replace(/\D/g, '').slice(0, 11);
}

function toggleAgreement() {
  agreed.value = !agreed.value;
}

function onViewAgreement(type: 'user' | 'privacy') {
  const url = `/pages/agreement/index?tab=${type}`;
  console.info('[login] open agreement page, type=', type);
  uni.navigateTo({ url });
}

function onCallAdmin() {
  void callContactOperator(contactPickerRef.value);
  console.info('[login] call admin contact');
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

/* 全屏背景图 */
.bg-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
	min-height: 100vh; 
  z-index: 0;
}

/* 表单区域：垂直居中偏上 */
.form-wrap {
  position: relative;
  z-index: 1;
  margin-top: 380rpx;
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

/* 登录按钮 */
.btn-login {
  margin-top: 56rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 20rpx;
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
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
  color: #236eff;
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
  color: #236EFF;
}
</style>
