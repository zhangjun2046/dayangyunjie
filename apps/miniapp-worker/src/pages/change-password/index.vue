<template>
  <view class="page">
    <view class="tip-card">
      <text class="tip-text">为保障账号安全，请设置 6–20 位新密码，修改成功后需重新登录。</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">旧密码</text>
        <view class="input-card">
          <input
            class="form-input"
            type="text"
            password
            placeholder="请输入当前密码"
            placeholder-class="input-placeholder"
            :value="oldPassword"
            @input="oldPassword = $event.detail.value"
            maxlength="32"
          />
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">新密码</text>
        <view class="input-card">
          <input
            class="form-input"
            type="text"
            password
            placeholder="请输入新密码（6–20位）"
            placeholder-class="input-placeholder"
            :value="newPassword"
            @input="newPassword = $event.detail.value"
            maxlength="20"
          />
        </view>
      </view>

      <view class="form-item form-item--last">
        <text class="form-label">确认密码</text>
        <view class="input-card">
          <input
            class="form-input"
            type="text"
            password
            placeholder="再次输入新密码"
            placeholder-class="input-placeholder"
            :value="confirmPassword"
            @input="confirmPassword = $event.detail.value"
            maxlength="20"
          />
        </view>
      </view>
    </view>

    <button
      class="btn-submit"
      :class="{ 'btn-submit--loading': submitting }"
      :disabled="submitting"
      @tap="onSubmit"
    >
      {{ submitting ? '提交中…' : '确认修改' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { changePassword } from '@/api/worker';

const authStore = useAuthStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const submitting = ref(false);

async function onSubmit() {
  const workerId = authStore.worker?.id;
  if (!workerId) return;

  if (!oldPassword.value.trim()) {
    uni.showToast({ title: '请输入旧密码', icon: 'none' });
    return;
  }
  if (newPassword.value.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' });
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码输入不一致', icon: 'none' });
    return;
  }
  if (newPassword.value === oldPassword.value) {
    uni.showToast({ title: '新密码不能与旧密码相同', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await changePassword(workerId, oldPassword.value.trim(), newPassword.value);
    console.info('[change-password] success, workerId=', workerId);
    uni.showModal({
      title: '修改成功',
      content: '密码已更新，请重新登录',
      showCancel: false,
      success() {
        authStore.logout();
        uni.redirectTo({ url: '/pages/login/index' });
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '修改失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[change-password] error', msg);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F8FAFF;
  padding: 24rpx;
  box-sizing: border-box;
}

.tip-card {
  background: #F0F6FF;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #4C5760;
  line-height: 1.6;
}

.form-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.06);
}

.form-item {
  margin-bottom: 28rpx;
}

.form-item--last {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #4C5760;
  margin-bottom: 12rpx;
}

.input-card {
  background: #F7F9FC;
  border-radius: 16rpx;
  padding: 0 28rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.form-input {
  flex: 1;
  height: 88rpx;
  font-size: 28rpx;
  color: #333;
  background: transparent;
}

.input-placeholder {
  color: #b0b8c4;
  font-size: 28rpx;
}

.btn-submit {
  margin-top: 68rpx;
  width: 100%;
  height: 88rpx;
  border-radius:20rpx;
	background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);	
  color: #ffffff;
  font-size: 28rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.28);
}


/* .btn {
  flex: 1;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  text-align: center;
  margin: 0;
  padding: 0;
} */
/* 
.btn::after {
  display: none;
}

.btn-outline {
  background: #ffffff;
  color: #236EFF;
  border: 1rpx solid #236EFF;
}

.btn-primary {
  background: linear-gradient(135deg, #246BFF 0%, #1AA1FF 100%);
  color: #ffffff;
} */




.btn-submit::after {
  border: none;
}

.btn-submit--loading,
.btn-submit[disabled] {
  opacity: 0.6;
}
</style>
