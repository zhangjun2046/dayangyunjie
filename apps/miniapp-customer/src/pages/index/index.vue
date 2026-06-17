<template>
  <view class="page">
    <!-- Banner 轮播 -->
    <swiper class="banner-swiper" circular autoplay interval="4000" indicator-dots indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#ffffff">
      <swiper-item>
        <view class="banner-card">
          <!-- 左侧文案 -->
          <view class="banner-text">
            <text class="banner-tag">#清洁每个角落 保护家人健康#</text>
            <text class="banner-title">8.8折深度保洁</text>
            <text class="banner-title accent">优惠券</text>
            <view class="banner-btn" @tap="onBannerTap">立即领取</view>
          </view>
          <!-- 右侧装饰 -->
          <view class="banner-deco">
            <view class="deco-circle-lg" />
            <view class="deco-circle-sm" />
            <view class="deco-coupon">
              <text class="coupon-label">8.8折</text>
              <text class="coupon-sub">深度保洁</text>
            </view>
          </view>
        </view>
      </swiper-item>
      <swiper-item>
        <view class="banner-card banner-card-green">
          <view class="banner-text">
            <text class="banner-tag">#废旧物品换新价#</text>
            <text class="banner-title">废品上门</text>
            <text class="banner-title accent">免费回收</text>
            <view class="banner-btn" @tap="onBannerTap">立即预约</view>
          </view>
          <view class="banner-deco">
            <view class="deco-circle-lg green" />
            <view class="deco-circle-sm green" />
            <view class="deco-coupon green">
              <text class="coupon-label">免费</text>
              <text class="coupon-sub">上门回收</text>
            </view>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 服务入口 -->
    <view class="service-section">
      <view class="section-header">
        <text class="section-title">服务项目</text>
        <text class="section-more">查看全部 ›</text>
      </view>

      <!-- 第一行：保洁 + 废品 -->
      <view class="service-row">
        <view class="service-card" @tap="onBookService('cleaning')">
          <view class="card-top">
            <view class="icon-circle blue">
              <image class="icon-image" src="/static/icons/cleaning.svg" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">保洁服务</text>
              <text class="card-subtitle">预计30分钟上门</text>
            </view>
          </view>
          <view class="arrow-btn blue-btn">
            <text class="arrow-icon">→</text>
          </view>
        </view>

        <view class="service-card" @tap="onBookService('recycling')">
          <view class="card-top">
            <view class="icon-circle green">
              <image class="icon-image" src="/static/icons/recycling.svg" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">废品回收</text>
              <text class="card-subtitle">预计30分钟上门</text>
            </view>
          </view>
          <view class="arrow-btn green-btn">
            <text class="arrow-icon">→</text>
          </view>
        </view>
      </view>

      <!-- 第二行：咨询（宽卡横跨全行） -->
      <view class="service-row">
        <view class="service-card service-card-wide" @tap="onBookService('consult')">
          <view class="card-top">
            <view class="icon-circle orange">
              <image class="icon-image" src="/static/icons/housekeeping.svg" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">家政服务</text>
              <text class="card-subtitle">预计30分钟上门</text>
            </view>
          </view>
          <view class="arrow-btn orange-btn">
            <text class="arrow-icon">→</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部客服条 -->
    <view class="customer-service-bar">
      <view class="cs-info">
        <image class="cs-avatar" src="/static/images/default-avatar.png" mode="aspectFill" />
        <text class="cs-text">客服在线 · 快速响应</text>
      </view>
      <view class="cs-btn" @tap="onCallService">电话预约</view>
    </view>

    <!-- 身份补全弹窗 -->
    <ProfileCompleteModal
      ref="profileModalRef"
      @completed="onProfileCompleted"
    />

    <!-- 隐私协议弹窗（首次进入由首页负责触发） -->
    <PrivacyModal
      ref="privacyModalRef"
      @agreed="onPrivacyAgreed"
      @declined="onPrivacyDeclined"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import ProfileCompleteModal from '@/components/ProfileCompleteModal.vue';
import PrivacyModal from '@/components/PrivacyModal.vue';

const authStore = useAuthStore();
const profileModalRef = ref<InstanceType<typeof ProfileCompleteModal> | null>(null);
const privacyModalRef = ref<InstanceType<typeof PrivacyModal> | null>(null);

let pendingServiceType = '';

// ── 隐私 & 登录流程 ────────────────────────────────────────────

/**
 * 获取微信登录 code
 * 小程序用 wx.login；H5 环境用 mock code
 */
function getLoginCode(): Promise<string> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res: { code: string }) => resolve(res.code),
      fail: (err: { errMsg: string }) => reject(new Error(String(err.errMsg))),
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(`mock_h5_${Date.now()}`);
  // #endif
}

/** 执行微信静默登录 */
async function doWechatLogin() {
  try {
    const code = await getLoginCode();
    await authStore.wechatLogin(code);
    console.info('[home] wechatLogin success, residentId=', authStore.resident?.id);
  } catch (err) {
    console.info('[home] wechatLogin failed:', String(err));
    uni.showToast({ title: '登录失败，请重试', icon: 'none' });
  }
}

/** 用户同意隐私协议：标记已同意后，进入微信手机号授权步骤，授权成功才完成登录 */
function onPrivacyAgreed() {
  authStore.setPrivacyAgreed();
  profileModalRef.value?.show();
  console.info('[home] privacy agreed, showing phone auth modal');
}

/** 用户拒绝隐私协议 */
function onPrivacyDeclined() {
  uni.showToast({ title: '需同意协议才能使用完整功能', icon: 'none', duration: 2000 });
}

/**
 * 每次页面显示时检查隐私协议与登录态
 * onShow 比 onMounted 更适合：重新进入 Tab 时也会触发
 */
onShow(() => {
  if (authStore.isLoggedIn) return;

  if (!authStore.hasAgreedPrivacy) {
    // 等待组件挂载完成
    setTimeout(() => {
      privacyModalRef.value?.show();
    }, 300);
    return;
  }

  if (!authStore.hasPhone) {
    // 已同意隐私但未完成手机授权 → 重新弹出手机授权弹窗，不允许跳过
    setTimeout(() => {
      profileModalRef.value?.show();
    }, 300);
    return;
  }

  // 已同意协议、已完成手机授权但 token 失效 → 静默重新登录
  doWechatLogin();
});

// ── 服务预约 ────────────────────────────────────────────────────

function onBannerTap() {
  uni.showToast({ title: '活动详情（P3.2 实现）', icon: 'none' });
}

function onBookService(type: string) {
  if (!authStore.hasPhone) {
    pendingServiceType = type;
    profileModalRef.value?.show();
    console.info('[home] profile complete required before booking, type=', type);
    return;
  }
  navigateToService(type);
}

async function onProfileCompleted(payload: { phone: string }) {
  console.info('[home] profile completed, phone=', payload.phone.slice(0, 3) + '****', 'pendingServiceType=', pendingServiceType);

  if (!authStore.isLoggedIn) {
    // 初次登录流程：手机授权完成后执行微信登录，登录成功才标记已登录
    await doWechatLogin();
    console.info('[home] initial login completed via phone auth, isLoggedIn=', authStore.isLoggedIn);
    return;
  }

  // 已登录时补全资料，完成后跳转到预约服务
  uni.showToast({ title: '信息完善成功！', icon: 'success', duration: 1500 });
  setTimeout(() => {
    if (pendingServiceType) {
      navigateToService(pendingServiceType);
      pendingServiceType = '';
    }
  }, 1600);
}

function navigateToService(type: string) {
  uni.showToast({ title: `${type} 预约（P3.2 实现）`, icon: 'none' });
}

function onCallService() {
  uni.makePhoneCall({ phoneNumber: '400-123-4567' });
}
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* ── Banner ── */
.banner-swiper {
  width: 100%;
  height: 320rpx;
}

.banner-card {
  width: 100%;
  height: 320rpx;
  background: linear-gradient(135deg, #1677ff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40rpx;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.banner-card-green {
  background: linear-gradient(135deg, #07c160 0%, #36cfc9 100%);
}

.banner-text {
  flex: 1;
  z-index: 2;
}

.banner-tag {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 12rpx;
}

.banner-title {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
}

.banner-title.accent {
  color: #ffe566;
}

.banner-btn {
  display: inline-block;
  margin-top: 20rpx;
  padding: 10rpx 28rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 600;
}

/* 右侧装饰 */
.banner-deco {
  width: 220rpx;
  height: 100%;
  position: relative;
  flex-shrink: 0;
  z-index: 1;
}

.deco-circle-lg {
  position: absolute;
  right: -30rpx;
  top: 20rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.15);
}

.deco-circle-sm {
  position: absolute;
  right: 60rpx;
  bottom: 20rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
}

.deco-circle-lg.green,
.deco-circle-sm.green {
  background-color: rgba(255, 255, 255, 0.18);
}

.deco-coupon {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 120rpx;
  height: 120rpx;
  background-color: rgba(255, 255, 255, 0.22);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
}

.deco-coupon.green {
  background-color: rgba(255, 255, 255, 0.2);
}

.coupon-label {
  font-size: 34rpx;
  font-weight: 800;
  color: #ffe566;
}

.deco-coupon.green .coupon-label {
  color: #ffffff;
  font-size: 26rpx;
}

.coupon-sub {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4rpx;
}

/* ── 服务入口 ── */
.service-section {
  padding: 28rpx 24rpx 160rpx; /* 增加底部 padding，避免被固定定位的客服条遮挡 */
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.section-more {
  font-size: 24rpx;
  color: #999;
}

.service-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

/* 服务卡片 */
.service-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

.service-card-wide {
  flex: 1;
  min-height: 140rpx;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.service-card-wide .card-top {
  align-items: center;
}

/* 图标圆 */
.icon-circle {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-card-wide .icon-circle {
  width: 80rpx;
  height: 80rpx;
}

.icon-circle.blue {
  background-color: #e8f1ff;
}

.icon-circle.green {
  background-color: #e8f9f0;
}

.icon-circle.orange {
  background-color: #fff3e8;
}

.icon-image {
  width: 48rpx;
  height: 48rpx;
  display: block;
  flex-shrink: 0;
}

.service-card-wide .icon-image {
  width: 40rpx;
  height: 40rpx;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-top: 4rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.card-subtitle {
  font-size: 22rpx;
  color: #aaa;
  line-height: 1.4;
}

/* 箭头按钮 */
.arrow-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  flex-shrink: 0;
}

.service-card-wide .arrow-btn {
  align-self: center;
}

.arrow-btn.blue-btn {
  background-color: #1677ff;
}

.arrow-btn.green-btn {
  background-color: #07c160;
}

.arrow-btn.orange-btn {
  background-color: #fa8c16;
}

.arrow-icon {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

/* ── 底部客服条 ── */
.customer-service-bar {
  position: fixed;
  bottom: 40rpx;
  left: 24rpx;
  right: 24rpx;
  background-color: #ffffff;
  border-radius: 100rpx;
  padding: 12rpx 16rpx 12rpx 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.cs-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cs-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
}

.cs-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.cs-btn {
  background-color: #1677ff;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  padding: 16rpx 36rpx;
  border-radius: 40rpx;
}
</style>
