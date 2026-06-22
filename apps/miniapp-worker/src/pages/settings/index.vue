<template>
  <view class="page">
    <!-- 修改密码菜单项 -->
    <view class="menu-group">
      <view class="menu-item" @tap="onToggleChangePassword">
        <view class="menu-left">
          <text class="menu-icon">🔑</text>
          <text class="menu-label">修改密码</text>
        </view>
        <text class="menu-arrow">{{ showForm ? '∨' : '›' }}</text>
      </view>

      <!-- 内联修改密码表单 -->
      <view v-if="showForm" class="form-wrap">
        <view class="form-item">
          <text class="form-label">旧密码</text>
          <input
            class="form-input"
            type="text"
            password
            placeholder="请输入当前密码"
            :value="oldPassword"
            @input="oldPassword = $event.detail.value"
            maxlength="32"
          />
        </view>
        <view class="form-item">
          <text class="form-label">新密码</text>
          <input
            class="form-input"
            type="text"
            password
            placeholder="请输入新密码（6–20位）"
            :value="newPassword"
            @input="newPassword = $event.detail.value"
            maxlength="20"
          />
        </view>
        <view class="form-item">
          <text class="form-label">确认密码</text>
          <input
            class="form-input"
            type="text"
            password
            placeholder="再次输入新密码"
            :value="confirmPassword"
            @input="confirmPassword = $event.detail.value"
            maxlength="20"
          />
        </view>
        <button
          class="btn-submit"
          :disabled="submitting"
          @tap="onSubmitChangePassword"
        >
          {{ submitting ? '提交中…' : '确认修改' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { changePassword } from '@/api/worker';

const authStore = useAuthStore();

/** 是否展开修改密码表单 */
const showForm = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const submitting = ref(false);

function onToggleChangePassword() {
  showForm.value = !showForm.value;
  if (!showForm.value) {
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  }
  console.info('[settings] toggle change-password form, show=', showForm.value);
}

async function onSubmitChangePassword() {
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
    console.info('[settings] changePassword success, workerId=', workerId);
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
    console.info('[settings] changePassword error', msg);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f0f5ff;
  padding: 24rpx;
}

/* ── 菜单组 ── */
.menu-group {
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 32rpx;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  font-size: 32rpx;
  width: 40rpx;
  text-align: center;
}

.menu-label {
  font-size: 28rpx;
  color: #333;
}

.menu-arrow {
  font-size: 30rpx;
  color: #ccc;
  line-height: 1;
}

/* ── 内联表单 ── */
.form-wrap {
  padding: 0 32rpx 32rpx;
  border-top: 1rpx solid #f5f5f5;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #888;
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #f7f9fc;
  border: 1rpx solid #e0e8f4;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
  background: #1677ff;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}

.btn-submit[disabled] {
  opacity: 0.6;
}
</style>
