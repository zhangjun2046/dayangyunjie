<template>
  <view v-if="visible" class="privacy-overlay">
    <view class="privacy-modal">
      <view class="modal-header">
        <text class="title">用户隐私保护提示</text>
      </view>

      <scroll-view class="modal-body" scroll-y>
        <text class="app-name">大洋云洁</text>
        <text class="intro">感谢您使用大洋云洁智享社区服务平台。在您使用本服务前，请仔细阅读</text>
        <view class="link-row">
          <text class="link" @tap="onOpenAgreement">《用户协议》</text>
          <text class="intro">与</text>
          <text class="link" @tap="onOpenPrivacy">《隐私政策》</text>
          <text class="intro">。</text>
        </view>

        <text class="section-title">一、我们收集的信息</text>
        <text class="section-content">
          为了提供预约服务，我们需要获取您的微信账号基本信息（昵称、头像），以及在您首次下单时获取您的手机号码和姓名，用于联系确认服务。
        </text>

        <text class="section-title">二、信息使用目的</text>
        <text class="section-content">
          您的个人信息仅用于：服务预约与调度、订单状态通知、客服沟通，不会向第三方共享或出售。
        </text>

        <text class="section-title">三、信息存储与安全</text>
        <text class="section-content">
          我们采用加密传输和安全存储措施保护您的信息，数据存储于中国境内符合规定的服务器。
        </text>

        <text class="section-title">四、您的权利</text>
        <text class="section-content">
          您可随时在「我的」页面查看本协议，或通过客服申请删除个人数据。
        </text>
      </scroll-view>

      <view class="modal-footer">
        <button class="btn-decline" @tap="onDecline">暂不使用</button>
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="btn-agree"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onAgree"
        >
          同意并继续
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="btn-agree" @tap="onAgree">同意并继续</button>
        <!-- #endif -->
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'agreed'): void;
  (e: 'declined'): void;
}>();

const visible = ref(false);

function show() {
  visible.value = true;
}

function hide() {
  visible.value = false;
}

function onAgree() {
  visible.value = false;
  emit('agreed');
  console.info('[PrivacyModal] user agreed');
}

function onDecline() {
  visible.value = false;
  emit('declined');
  console.info('[PrivacyModal] user declined');
}

function onOpenAgreement() {
  console.info('[PrivacyModal] open user-agreement');
  uni.navigateTo({ url: '/pages/agreement/index?tab=user' });
}

function onOpenPrivacy() {
  console.info('[PrivacyModal] open privacy-policy');
  uni.navigateTo({ url: '/pages/agreement/index?tab=privacy' });
}

defineExpose({ show, hide });
</script>

<style scoped>
.privacy-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 9999;
}

.privacy-modal {
  width: 100%;
  background-color: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx 60rpx;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  text-align: center;
  margin-bottom: 32rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.modal-body {
  flex: 1;
  max-height: 50vh;
  margin-bottom: 40rpx;
}

.app-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #236EFF;
  margin-bottom: 16rpx;
}

.intro {
  font-size: 28rpx;
  color: #555;
  line-height: 1.6;
}

.link-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 24rpx;
}

.link {
  font-size: 28rpx;
  color: #236EFF;
  line-height: 1.6;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.section-content {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  gap: 24rpx;
}

.btn-decline {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #f2f2f2;
  color: #666;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
}

.btn-agree {
  flex: 2;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #236EFF;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  margin: 0;
}

.btn-agree::after,
.btn-decline::after {
  border: none;
}
</style>
