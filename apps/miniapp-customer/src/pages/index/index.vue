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
            <RemoteImage
              class="banner-img"
              :src="banner.imageUrl"
              mode="aspectFill"
              variant="banner"
            />
            <!-- <view v-if="banner.title" class="banner-img-overlay">
              <text class="banner-img-title">{{ banner.title }}</text>
            </view> -->
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
      <!-- <view class="section-header">
        <text class="section-title">服务项目</text>
        <text class="section-sub">专业上门 · 品质保障</text>
      </view> -->

      <!-- 第一行：保洁 + 废品 -->
      <view class="service-row">
        <view class="service-card" @tap="onServiceTap('cleaning')">
          <view class="card-top">
            <view class="icon-circle">
              <image class="icon-image" src="/static/icons/cleaning.png" mode="aspectFill" />
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
          <view class="card-top" style="display: flex;">
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
					<text class="cs-label">客服在线  快速响应</text>
        </view>
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

    <ContactOperatorPicker ref="contactPickerRef" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import RemoteImage from '@/components/RemoteImage.vue';
import ProfileCompleteModal from '@/components/ProfileCompleteModal.vue';
import PrivacyModal from '@/components/PrivacyModal.vue';
import ContactOperatorPicker from '@/components/ContactOperatorPicker.vue';
import { fetchActiveBanners, type BannerDto } from '@/api/banner';
import { callContactOperator } from '@/utils/call-contact-operator';

const authStore = useAuthStore();
const profileModalRef = ref<InstanceType<typeof ProfileCompleteModal> | null>(null);
const privacyModalRef = ref<InstanceType<typeof PrivacyModal> | null>(null);
const contactPickerRef = ref<InstanceType<typeof ContactOperatorPicker> | null>(null);

/** 动态 Banner 列表（API 返回；为空则展示品牌默认卡） */
const banners = ref<BannerDto[]>([]);

/** 待跳转的服务类型（补全手机号后继续） */
let pendingServiceType = '';

// ── 页面数据加载 ─────────────────────────────────────────────────

/** 加载首页 Banner，失败静默处理，不影响页面展示 */
async function loadPageData() {
  try {
    banners.value = (await fetchActiveBanners()) ?? [];
    console.info('[home] banners loaded, count=', banners.value.length);
  } catch {
    console.info('[home] banners load failed, using default placeholder');
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

/**
 * 确保已登录后再弹出手机号授权
 * decrypt-phone 需要 JWT，必须先 wx.login 换 token
 */
async function ensureLoginThenShowPhoneModal() {
  if (!authStore.isLoggedIn) {
    await doWechatLogin();
  }
  if (!authStore.isLoggedIn) {
    console.info('[home] skip phone modal: still not logged in');
    return;
  }
  // 登录后若服务端已有手机号，无需再授权
  if (authStore.hasPhone && authStore.resident?.phone) {
    console.info('[home] phone already bound on server, skip phone modal');
    return;
  }
  profileModalRef.value?.show();
  console.info('[home] showing phone auth modal, residentId=', authStore.resident?.id);
}

/** 用户同意隐私协议：先静默登录，再进入微信手机号授权 */
async function onPrivacyAgreed() {
  authStore.setPrivacyAgreed();
  await ensureLoginThenShowPhoneModal();
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

  if (!authStore.hasAgreedPrivacy) {
    if (!authStore.isLoggedIn) {
      setTimeout(() => {
        privacyModalRef.value?.show();
      }, 300);
    }
    return;
  }

  if (!authStore.isLoggedIn) {
    void (async () => {
      await doWechatLogin();
      if (authStore.isLoggedIn && !authStore.hasPhone) {
        profileModalRef.value?.show();
      }
    })();
    return;
  }

  if (!authStore.hasPhone) {
    setTimeout(() => {
      profileModalRef.value?.show();
    }, 300);
  }
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

/** 点击服务卡片：先确认登录与手机号，再跳转服务详情页 */
async function onServiceTap(type: string) {
  if (!authStore.hasPhone) {
    pendingServiceType = type;
    await ensureLoginThenShowPhoneModal();
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

  // 兜底：极端情况下授权前未登录成功，补一次登录并写回本地 phone
  if (!authStore.isLoggedIn) {
    await doWechatLogin();
    authStore.setPhone(payload.phone);
    console.info('[home] late login after phone auth, isLoggedIn=', authStore.isLoggedIn);
  }

  if (pendingServiceType) {
    navigateToServiceDetail(pendingServiceType);
    pendingServiceType = '';
  }
}

// ── 客服电话 ─────────────────────────────────────────────────

function onCallService() {
  void callContactOperator(contactPickerRef.value);
  console.info('[home] call contact operator');
}
</script>

<style scoped>
.page {
  background-color: #F8FAFF;
  min-height: 100vh;
	padding: 24rpx;
}

/* ── Banner ── */
.banner-swiper {
  width: 100%;
  height: 300rpx;
}

/* API 图片 Banner */
.banner-img-card {
  width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
  height: 300rpx;
  position: relative;
  overflow: hidden;
}

.banner-img {
  width: 100%;
  height: 100%;
	border-radius: 30rpx;
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
	border-radius: 30rpx;
  width: 100%;
  height: 300rpx;
  background: linear-gradient(135deg, #236EFF 0%, #36cfc9 100%);
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
  padding: 24rpx 0;
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
  padding: 36rpx 30rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}

.service-card-wide {
  flex: 1;
  min-height: 140rpx;
	display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
}

.card-top {
  /* display: flex;
  align-items: flex-start; */
  gap: 16rpx;
	margin-bottom: 20rpx;
}

.service-card-wide .card-top {
  align-items: center;
}

/* 图标圆 */
.icon-circle {
  width: 142rpx;
  height: 142rpx;
	margin-left: -20rpx;
}

.service-card-wide .icon-circle {
  width: 142rpx;
  height: 142rpx;
}

.icon-image {
  /* 图标 PNG 自带圆角方形底色，无需再叠加外层圆形背景，
     故尺寸与 icon-circle 容器基本一致，避免“外圈大、图标小”的比例失衡 */
  width: 142rpx;
  height: 142rpx;
  display: block;
  flex-shrink: 0;
}

.service-card-wide .icon-image {
  width: 142rpx;
  height: 142rpx;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 8rpx 0;
}

.card-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #303030;
}

.card-subtitle {
  font-size: 28rpx;
  color: #303030;
}

/* 箭头按钮 */
.arrow-btn {
  width: 58rpx;
  height: 58rpx;
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
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
}

.arrow-btn.green-btn {
	background: linear-gradient( 306deg, #2FDE84 0%, #0FB660 100%);
}

.arrow-btn.orange-btn {
	background: linear-gradient( 135deg, #FF6A24 0%, #FF931A 100%);
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
  padding: 16rpx 16rpx 16rpx 16rpx;
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
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
}

.cs-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.cs-label {
  font-size: 32rpx;
  color: #333333;
	font-weight: bold;
}

.cs-phone {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1rpx;
}

.cs-btn {
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  padding: 20rpx 30rpx;
  border-radius: 40rpx;
}
</style>
