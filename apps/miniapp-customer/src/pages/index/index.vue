<template>
  <view class="page">
    <!-- Banner 轮播 -->
    <swiper
      class="banner-swiper"
      circular
      autoplay
      interval="4000"
      indicator-dots
      indicator-color="rgba(255,255,255,0.5)"
      indicator-active-color="#ffffff"
    >
      <!-- 有效 Banner 数据（来自 API） -->
      <template v-if="banners.length > 0">
        <swiper-item v-for="banner in banners" :key="banner.id">
          <view class="banner-img-card" @tap="onBannerTap(banner)">
            <image
              class="banner-img"
              :src="banner.imageUrl"
              mode="aspectFill"
            />
            <view v-if="banner.title" class="banner-img-overlay">
              <text class="banner-img-title">{{ banner.title }}</text>
            </view>
          </view>
        </swiper-item>
      </template>

      <!-- 无数据时显示品牌默认占位卡 -->
      <template v-else>
        <swiper-item>
          <view class="banner-card">
            <view class="banner-text">
              <text class="banner-slogan">大洋云洁·智享社区</text>
              <text class="banner-desc">专业上门服务 · 品质生活首选</text>
            </view>
            <view class="banner-deco">
              <view class="deco-circle-lg" />
              <view class="deco-circle-sm" />
              <view class="deco-badge">
                <text class="deco-badge-text">专业</text>
                <text class="deco-badge-sub">放心服务</text>
              </view>
            </view>
          </view>
        </swiper-item>
      </template>
    </swiper>

    <!-- 服务入口 -->
    <view class="service-section">
      <view class="section-header">
        <text class="section-title">服务项目</text>
        <text class="section-sub">专业上门 · 品质保障</text>
      </view>

      <!-- 第一行：保洁 + 废品 -->
      <view class="service-row">
        <view class="service-card" @tap="onServiceTap('cleaning')">
          <view class="card-top">
            <view class="icon-circle">
              <image class="icon-image" src="/static/icons/cleaning.png" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">保洁服务</text>
              <text class="card-subtitle">预约上门 · 深度清洁</text>
            </view>
          </view>
          <view class="arrow-btn blue-btn">
            <text class="arrow-icon">›</text>
          </view>
        </view>

        <view class="service-card" @tap="onServiceTap('recycling')">
          <view class="card-top">
            <view class="icon-circle">
              <image class="icon-image" src="/static/icons/recycling.png" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">废品回收</text>
              <text class="card-subtitle">免费上门 · 绿色环保</text>
            </view>
          </view>
          <view class="arrow-btn green-btn">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>

      <!-- 第二行：家政咨询（宽卡横跨全行） -->
      <view class="service-row">
        <view class="service-card service-card-wide" @tap="onServiceTap('consult')">
          <view class="card-top">
            <view class="icon-circle">
              <image class="icon-image" src="/static/icons/housekeeping.png" mode="aspectFit" />
            </view>
            <view class="card-info">
              <text class="card-title">家政服务</text>
              <text class="card-subtitle">专业顾问 · 一站咨询</text>
            </view>
          </view>
          <view class="arrow-btn orange-btn">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部客服条 -->
    <view class="customer-service-bar">
      <view class="cs-info">
        <image class="cs-avatar" src="/static/images/customer-service-avatar.png" mode="aspectFill" />
        <view class="cs-text-wrap">
          <text class="cs-label">{{ contactName }}</text>
          <text class="cs-phone">{{ contactPhone }}</text>
        </view>
      </view>
      <view class="cs-btn" @tap="onCallService">立即拨打</view>
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
import { fetchActiveBanners, type BannerDto } from '@/api/banner';
import { fetchContactOperator } from '@/api/operator';

const authStore = useAuthStore();
const profileModalRef = ref<InstanceType<typeof ProfileCompleteModal> | null>(null);
const privacyModalRef = ref<InstanceType<typeof PrivacyModal> | null>(null);

/** 动态 Banner 列表（API 返回；为空则展示品牌默认卡） */
const banners = ref<BannerDto[]>([]);

/** 客服联系人（来自 /operators/contact；默认兜底值） */
const contactName = ref('电话预约');
const contactPhone = ref('400-123-4567');

/** 待跳转的服务类型（补全手机号后继续） */
let pendingServiceType = '';

// ── 页面数据加载 ─────────────────────────────────────────────────

/** 并发加载首页动态数据，任一失败均静默处理，不影响页面展示 */
async function loadPageData() {
  const [bannersResult, operatorResult] = await Promise.allSettled([
    fetchActiveBanners(),
    fetchContactOperator(),
  ]);

  if (bannersResult.status === 'fulfilled') {
    banners.value = bannersResult.value ?? [];
    console.info('[home] banners loaded, count=', banners.value.length);
  } else {
    console.info('[home] banners load failed, using default placeholder');
  }

  if (operatorResult.status === 'fulfilled' && operatorResult.value?.phone) {
    contactName.value = operatorResult.value.name || '电话预约';
    contactPhone.value = operatorResult.value.phone;
    console.info('[home] contact operator loaded=', contactName.value, contactPhone.value);
  } else {
    console.info('[home] operator contact load failed, using default phone');
  }
}

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

/** 用户同意隐私协议：标记已同意后，进入微信手机号授权步骤 */
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
 * 每次页面显示时检查隐私协议与登录态，并加载首页动态数据
 * onShow 比 onMounted 更适合：重新进入 Tab 时也会触发
 */
onShow(() => {
  // 无论登录状态如何，每次显示都刷新首页动态数据
  loadPageData();

  if (authStore.isLoggedIn) return;

  if (!authStore.hasAgreedPrivacy) {
    setTimeout(() => {
      privacyModalRef.value?.show();
    }, 300);
    return;
  }

  if (!authStore.hasPhone) {
    setTimeout(() => {
      profileModalRef.value?.show();
    }, 300);
    return;
  }

  doWechatLogin();
});

// ── Banner 交互 ───────────────────────────────────────────────

function onBannerTap(banner: BannerDto) {
  if (banner.linkType === 'PAGE' && banner.linkTarget) {
    uni.navigateTo({ url: banner.linkTarget });
  } else if (banner.linkType === 'URL' && banner.linkTarget) {
    // #ifdef MP-WEIXIN
    uni.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(banner.linkTarget)}` });
    // #endif
    // #ifndef MP-WEIXIN
    window.open(banner.linkTarget, '_blank');
    // #endif
  }
  // linkType === 'NONE'：无动作
}

// ── 服务卡片导航 ──────────────────────────────────────────────

/** 点击服务卡片：先确认手机号，再跳转服务详情页 */
function onServiceTap(type: string) {
  if (!authStore.hasPhone) {
    pendingServiceType = type;
    profileModalRef.value?.show();
    console.info('[home] profile complete required before viewing service, type=', type);
    return;
  }
  navigateToServiceDetail(type);
}

/** 跳转服务详情页 */
function navigateToServiceDetail(type: string) {
  uni.navigateTo({ url: `/pages/service-detail/index?type=${type}` });
}

async function onProfileCompleted(payload: { phone: string }) {
  console.info('[home] profile completed, phone=', payload.phone.slice(0, 3) + '****', 'pendingServiceType=', pendingServiceType);

  if (!authStore.isLoggedIn) {
    await doWechatLogin();
    // resident.value 已由 wechatLogin 填入，现在再写一次 phone 确保持久化
    authStore.setPhone(payload.phone);
    console.info('[home] initial login completed via phone auth, isLoggedIn=', authStore.isLoggedIn);
    return;
  }

  uni.showToast({ title: '信息完善成功！', icon: 'success', duration: 1500 });
  setTimeout(() => {
    if (pendingServiceType) {
      navigateToServiceDetail(pendingServiceType);
      pendingServiceType = '';
    }
  }, 1600);
}

// ── 客服电话 ─────────────────────────────────────────────────

function onCallService() {
  uni.makePhoneCall({ phoneNumber: contactPhone.value });
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

/* API 图片 Banner */
.banner-img-card {
  width: 100%;
  height: 320rpx;
  position: relative;
  overflow: hidden;
}

.banner-img {
  width: 100%;
  height: 100%;
}

.banner-img-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 100%);
}

.banner-img-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}

/* 默认品牌占位卡 */
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

.banner-text {
  flex: 1;
  z-index: 2;
}

.banner-slogan {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}

.banner-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
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

.deco-badge {
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

.deco-badge-text {
  font-size: 34rpx;
  font-weight: 800;
  color: #ffe566;
}

.deco-badge-sub {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4rpx;
}

/* ── 服务入口 ── */
.service-section {
  padding: 28rpx 24rpx 160rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.section-sub {
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
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-card-wide .icon-circle {
  width: 64rpx;
  height: 64rpx;
}

.icon-image {
  /* 图标 PNG 自带圆角方形底色，无需再叠加外层圆形背景，
     故尺寸与 icon-circle 容器基本一致，避免“外圈大、图标小”的比例失衡 */
  width: 76rpx;
  height: 76rpx;
  display: block;
  flex-shrink: 0;
}

.service-card-wide .icon-image {
  width: 64rpx;
  height: 64rpx;
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
  font-size: 36rpx;
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

.cs-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.cs-label {
  font-size: 22rpx;
  color: #999;
}

.cs-phone {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1rpx;
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
