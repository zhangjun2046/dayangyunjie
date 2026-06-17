<template>
  <view v-if="visible" class="profile-overlay">
    <view class="profile-modal">
      <view class="modal-header">
        <view class="app-info">
          <image class="app-icon" src="/static/images/default-avatar.png" mode="aspectFill" />
          <text class="app-name">大洋云洁</text>
          <text class="app-action">申请获取以下信息</text>
        </view>
      </view>

      <view class="modal-body">
        <view class="info-group">
          <text class="info-title">你的手机号码</text>
          
          <!-- #ifdef MP-WEIXIN -->
          <view v-if="!form.phone" class="phone-auth-container">
            <button
              class="btn-wechat"
              open-type="getPhoneNumber"
              @getphonenumber="onGetPhoneNumber"
            >
              <image class="wechat-icon" src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M8.5 14c-.83 0-1.5-.67-1.5-1.5S7.67 11 8.5 11s1.5.67 1.5 1.5S9.33 14 8.5 14zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-3.5-8c-4.14 0-7.5 2.8-7.5 6.25 0 1.93 1.03 3.65 2.65 4.81l-.85 2.55 2.95-1.47c.87.24 1.79.36 2.75.36 4.14 0 7.5-2.8 7.5-6.25S16.14 6 12 6z'/%3E%3C/svg%3E" />
              微信一键授权手机号
            </button>
            <view class="manual-toggle" @tap="showManual = !showManual" v-if="!showManual">
              使用其他手机号码
            </view>
            <input
              v-if="showManual"
              v-model="form.phone"
              class="input-line mt-20"
              type="number"
              placeholder="请输入手机号"
              maxlength="11"
            />
          </view>
          
          <view v-else class="phone-filled-container">
            <text class="phone-number">{{ maskedPhone }}</text>
            <text class="phone-tag">微信绑定号码</text>
            <text class="icon-check">✓</text>
            <text class="phone-change" @tap="form.phone = ''">修改</text>
          </view>
          <!-- #endif -->

          <!-- #ifndef MP-WEIXIN -->
          <input
            v-model="form.phone"
            class="input-line"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
          <!-- #endif -->
        </view>
      </view>

      <view class="modal-footer">
        <button class="btn-reject" @tap="onCancel">拒绝</button>
        <button class="btn-allow" :disabled="!canSubmit" @tap="onSubmit">允许</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { decryptPhone } from '@/api/auth';

const emit = defineEmits<{
  (e: 'completed', payload: { phone: string }): void;
  (e: 'cancelled'): void;
}>();

const authStore = useAuthStore();

const visible = ref(false);
const showManual = ref(false);
const form = reactive({ phone: '' });

const maskedPhone = computed(() => {
  if (form.phone.length < 7) return form.phone;
  return form.phone.slice(0, 3) + '****' + form.phone.slice(-4);
});

const canSubmit = computed(() => /^1[3-9]\d{9}$/.test(form.phone));

function show() {
  form.phone = '';
  showManual.value = false;
  visible.value = true;
}

function hide() {
  visible.value = false;
}

/** 微信小程序 getPhoneNumber 回调（支持新版 code-only 模式） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onGetPhoneNumber(e: any) {
  const detail = e?.detail ?? {};
  console.info('[ProfileCompleteModal] getPhoneNumber detail', {
    hasPhoneNumber: !!detail.phoneNumber,
    hasCode: !!detail.code,
    errMsg: detail.errMsg,
  });

  if (detail.phoneNumber) {
    // 旧版微信：回调直接包含手机号
    form.phone = detail.phoneNumber;
    console.info('[ProfileCompleteModal] phone assigned directly');
  } else if (detail.errMsg && String(detail.errMsg).includes('ok') && detail.code) {
    // 新版微信：只返回 code，需后端解密
    try {
      uni.showLoading({ title: '获取中...' });
      const result = await decryptPhone(detail.code);
      form.phone = result.phone;
      console.info('[ProfileCompleteModal] phone decrypted via backend', { phoneLen: form.phone.length });
    } catch (err) {
      console.info('[ProfileCompleteModal] decryptPhone failed, fallback to manual', String(err));
      showManual.value = true;
      uni.showToast({ title: '获取失败，请手工输入', icon: 'none' });
    } finally {
      uni.hideLoading();
    }
  } else {
    // 用户拒绝授权或发生错误
    showManual.value = true;
    console.info('[ProfileCompleteModal] getPhoneNumber not ok, errMsg=', detail.errMsg);
    uni.showToast({ title: '授权失败，请手工输入', icon: 'none' });
  }
}

function onSubmit() {
  if (!canSubmit.value) return;
  const { phone } = form;
  authStore.setPhone(phone);
  visible.value = false;
  emit('completed', { phone });
  console.info('[ProfileCompleteModal] completed, phone=', phone.slice(0, 3) + '****');
}

function onCancel() {
  visible.value = false;
  emit('cancelled');
}

defineExpose({ show, hide });
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  z-index: 9999;
}

.profile-modal {
  width: 100%;
  background-color: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx 60rpx;
}

.modal-header {
  margin-bottom: 48rpx;
}

.app-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.app-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}

.app-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.app-action {
  font-size: 28rpx;
  color: #1a1a1a;
  margin-left: 8rpx;
}

.modal-body {
  margin-bottom: 60rpx;
}

.info-group {
  margin-bottom: 40rpx;
}

.info-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.input-line {
  width: 100%;
  height: 80rpx;
  border-bottom: 1rpx solid #e8e8e8;
  font-size: 32rpx;
  color: #333;
  padding: 0 8rpx;
}

.mt-20 {
  margin-top: 20rpx;
}

.phone-auth-container {
  display: flex;
  flex-direction: column;
}

.btn-wechat {
  width: 100%;
  height: 88rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin-bottom: 24rpx;
}

.wechat-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 12rpx;
}

.manual-toggle {
  font-size: 28rpx;
  color: #576b95;
  text-align: left;
  padding: 8rpx;
}

.phone-filled-container {
  display: flex;
  align-items: center;
  height: 80rpx;
  border-bottom: 1rpx solid #e8e8e8;
  padding: 0 8rpx;
}

.phone-number {
  font-size: 32rpx;
  color: #333;
  margin-right: 16rpx;
}

.phone-tag {
  font-size: 24rpx;
  color: #999;
  margin-right: 8rpx;
}

.icon-check {
  font-size: 28rpx;
  color: #07c160;
  font-weight: bold;
  margin-right: auto;
}

.phone-change {
  font-size: 28rpx;
  color: #576b95;
}

.modal-footer {
  display: flex;
  gap: 24rpx;
}

.btn-reject {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #f2f2f2;
  color: #07c160;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
}

.btn-allow {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
}

.btn-allow[disabled] {
  background-color: #a3e5c0;
}
</style>
