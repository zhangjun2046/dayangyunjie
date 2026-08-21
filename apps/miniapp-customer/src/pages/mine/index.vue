<template>
  <view class="page">
    <!-- 沉浸式头部：渐变背景顶到屏幕最上，导航透明叠在上面 -->
    <view class="hero">
      <view class="hero-bg" />
      <uni-nav-bar
        status-bar
        :border="false"
        background-color="transparent"
      />
      <view class="user-card">
        <RemoteImage
          class="avatar"
          :src="resident?.avatar || defaultAvatar"
          mode="aspectFill"
          variant="avatar"
        />
        <view class="user-info">
          <text class="phone-number">{{ displayPhone }}</text>
          <!-- 必须用 button + getPhoneNumber，点击才会出微信官方取号窗 -->
          <button
            v-if="!resident?.phone && isLoggedIn"
            class="phone-bind-btn"
            hover-class="none"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
          >
            点击绑定完整手机号
          </button>
        </view>
      </view>
    </view>

    <!-- 菜单组1：地址 & 投诉 & 通知 -->
    <view class="menu-group">
      <view class="menu-item" @tap="onGoAddress">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/address-pin.png" mode="aspectFit" />
          <text class="menu-label">我的地址</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
			<view class="menu-item" @tap="onGoComplaintList">
			  <view class="menu-left">
          <image class="menu-icon" src="/static/icons/icon_tousu_n.png" mode="aspectFit" />
			    <text class="menu-label">我的投诉</text>
			  </view>
			  <text class="menu-arrow">›</text>
			</view>
			
			<view class="menu-item" @tap="onCallService">
			  <view class="menu-left">
			    <image class="menu-icon" src="/static/icons/customer-service.png" mode="aspectFit" />
			    <text class="menu-label">客服联系方式</text>
			  </view>
			  <text class="menu-arrow">›</text>
			</view>
			<view class="menu-item" @tap="onViewAgreement">
			  <view class="menu-left">
			    <image class="menu-icon" src="/static/icons/privacy-shield.png" mode="aspectFit" />
			    <text class="menu-label">协议与隐私</text>
			  </view>
			  <view class="menu-right">
			    <text v-if="hasAgreedPrivacy" class="agreed-tag">已同意</text>
			    <text class="menu-arrow">›</text>
			  </view>
			</view>
      <!-- <view class="menu-item" @tap="onWechatPrivacy">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/privacy-shield.png" mode="aspectFit" />
          <text class="menu-label">微信隐私授权</text>
        </view>
        <text class="menu-arrow">›</text>
      </view> -->
      <!-- <view class="menu-item" @tap="onGoComplaintList">
        <view class="menu-left">
          <text class="menu-icon-emoji">📢</text>
          <text class="menu-label">我的投诉</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onNotification">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/notification-bell.png" mode="aspectFit" />
          <text class="menu-label">消息通知</text>
        </view>
        <text class="menu-arrow">›</text>
      </view> -->
    </view>

    <!-- 菜单组2：客服 & 协议 -->
    <!-- <view class="menu-group">
      <view class="menu-item" @tap="onCallService">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/customer-service.png" mode="aspectFit" />
          <text class="menu-label">客服联系方式</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onServiceAgreement">
        <view class="menu-left">
          <text class="menu-icon-emoji">📄</text>
          <text class="menu-label">服务协议</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onViewPrivacy">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/privacy-shield.png" mode="aspectFit" />
          <text class="menu-label">隐私协议</text>
        </view>
        <view class="menu-right">
          <text v-if="hasAgreedPrivacy" class="agreed-tag">已同意</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view> -->

    <!-- 退出登录按钮 -->
    <view class="logout-wrap" v-if="isLoggedIn">
      <button class="btn-logout" @tap="onLogout">退出登录</button>
    </view>

    <ContactOperatorPicker ref="contactPickerRef" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { decryptPhone } from '@/api/auth';
import ContactOperatorPicker from '@/components/ContactOperatorPicker.vue';
import RemoteImage from '@/components/RemoteImage.vue';
import { callContactOperator } from '@/utils/call-contact-operator';
import {
  getWechatPrivacySetting,
  requireWechatPrivacyAuthorize,
} from '@/utils/wechat-privacy';

const authStore = useAuthStore();
const contactPickerRef = ref<InstanceType<typeof ContactOperatorPicker> | null>(null);
const bindingPhone = ref(false);

const resident = computed(() => authStore.resident);
const isLoggedIn = computed(() => authStore.isLoggedIn);
const hasAgreedPrivacy = computed(() => authStore.hasAgreedPrivacy);
const defaultAvatar = '/static/images/default-avatar.png';

/** 显示手机号：有号码直接展示，否则用昵称/占位 */
const displayPhone = computed(() => {
  if (resident.value?.phone) return resident.value.phone;
  return resident.value?.nickname || '居民用户';
});

/** 解密前确保本地已有 accessToken（decrypt-phone 需 JWT） */
async function ensureAccessToken(): Promise<boolean> {
  if (authStore.isLoggedIn) return true;
  try {
    let code: string;
    // #ifdef MP-WEIXIN
    code = await new Promise<string>((resolve, reject) => {
      wx.login({
        success: (res: { code: string }) => resolve(res.code),
        fail: (err: { errMsg: string }) => reject(new Error(String(err.errMsg))),
      });
    });
    // #endif
    // #ifndef MP-WEIXIN
    code = `mock_h5_${Date.now()}`;
    // #endif
    await authStore.wechatLogin(code);
    return authStore.isLoggedIn;
  } catch (err) {
    console.info('[mine] ensure login failed', String(err));
    return false;
  }
}

function bindPhoneLocally(phone: string) {
  authStore.setPhone(phone);
  console.info('[mine] phone bound, phone=', phone.slice(0, 3) + '****');
}

/** 微信官方取号回调：成功则 decrypt-phone 写库并刷新本地 */
async function onGetPhoneNumber(e: { detail?: { phoneNumber?: string; code?: string; errMsg?: string } }) {
  const detail = e?.detail ?? {};
  console.info('[mine] getPhoneNumber detail', {
    hasPhoneNumber: !!detail.phoneNumber,
    hasCode: !!detail.code,
    errMsg: detail.errMsg,
  });

  if (bindingPhone.value) return;

  if (detail.phoneNumber) {
    bindPhoneLocally(detail.phoneNumber);
    uni.showToast({ title: '绑定成功', icon: 'success' });
    return;
  }

  if (detail.errMsg && String(detail.errMsg).includes('ok') && detail.code) {
    bindingPhone.value = true;
    try {
      uni.showLoading({ title: '获取中...' });
      const ready = await ensureAccessToken();
      if (!ready) {
        uni.showToast({ title: '请先登录后再授权', icon: 'none' });
        return;
      }
      const result = await decryptPhone(detail.code);
      bindPhoneLocally(result.phone);
      uni.showToast({ title: '绑定成功', icon: 'success' });
    } catch (err) {
      console.info('[mine] decryptPhone failed', String(err));
      uni.showToast({ title: '获取手机号失败，请重试', icon: 'none' });
    } finally {
      bindingPhone.value = false;
      uni.hideLoading();
    }
    return;
  }

  console.info('[mine] getPhoneNumber not ok, errMsg=', detail.errMsg);
  uni.showToast({ title: '授权失败', icon: 'none' });
}

function onGoAddress() {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/address-manage/index' });
  console.info('[mine] go address-manage');
}

function onGoComplaintList() {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages/complaint-list/index' });
  console.info('[mine] go complaint-list');
}

function onNotification() {
  uni.showToast({ title: '消息通知功能即将上线', icon: 'none' });
  console.info('[mine] notification placeholder');
}

function onCallService() {
  void callContactOperator(contactPickerRef.value);
  console.info('[mine] call contact operator');
}

function onServiceAgreement() {
  uni.showToast({ title: '服务协议功能即将上线', icon: 'none' });
  console.info('[mine] service agreement placeholder');
}

function onViewAgreement() {
  uni.navigateTo({ url: '/pages/agreement/index' });
  console.info('[mine] go agreement');
}

/** 拉起微信官方隐私授权弹窗，把同意状态同步到微信侧 */
async function onWechatPrivacy() {
  console.info('[mine] wechat privacy authorize tap');
  // #ifndef MP-WEIXIN
  uni.showModal({
    title: '微信隐私授权',
    content: '当前不是微信小程序环境。请用微信开发者工具导入 dist/dev/mp-weixin 后再点这一项。',
    showCancel: false,
  });
  return;
  // #endif

  // #ifdef MP-WEIXIN
  try {
    const setting = await getWechatPrivacySetting();
    console.info('[mine] privacy setting', setting);

    if (!setting.privacyContractName) {
      uni.showModal({
        title: '微信不会弹窗（正常）',
        content:
          '公众平台还没配置《用户隐私保护指引》，微信会直接判定“无需授权”，所以点了没有官方弹窗。\n\n请到微信公众平台 → 设置 → 服务内容声明 → 用户隐私保护指引，勾选手机号、相册后保存，再回到开发者工具重新编译试一次。',
        showCancel: false,
      });
      return;
    }

    if (!setting.needAuthorization) {
      uni.showModal({
        title: '已经授权过',
        content: `当前指引：${setting.privacyContractName}\n\n微信记录你已同意，不会再弹窗。开发者工具可在「详情 → 本地设置」清除授权数据后再试。`,
        showCancel: false,
      });
      authStore.setPrivacyAgreed();
      return;
    }

    await requireWechatPrivacyAuthorize();
    authStore.setPrivacyAgreed();
    uni.showModal({
      title: '已同步微信隐私授权',
      content: `已同意：${setting.privacyContractName}`,
      showCancel: false,
    });
    console.info('[mine] wechat privacy authorize success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : '授权失败';
    uni.showModal({
      title: '微信隐私授权',
      content: msg,
      showCancel: false,
    });
    console.info('[mine] wechat privacy authorize failed:', msg);
  }
  // #endif
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) {
        authStore.logout();
        console.info('[mine] user logged out');
        uni.switchTab({ url: '/pages/index/index' });
      }
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f0f5ff;
}

/* 沉浸式头部 */
.hero {
  position: relative;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: linear-gradient(135deg, #e8f1ff 0%, #f0f5ff 100%);
}

.hero :deep(.uni-navbar) {
  position: relative;
  z-index: 1;
}

/* 用户信息卡片 */
.user-card {
  position: relative;
  z-index: 1;
  padding: 24rpx 40rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #c8d8f0;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.15);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.phone-number {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
  letter-spacing: 2rpx;
}

.phone-bind-btn {
  margin: 6rpx 0 0;
  padding: 0;
  width: auto;
  background: transparent;
  border: none;
  line-height: 1.4;
  font-size: 24rpx;
  color: #236EFF;
  text-align: left;
}

.phone-bind-btn::after {
  border: none;
}

/* 菜单组 */
.menu-group {
  background-color: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  margin: 24rpx 24rpx 0;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.menu-icon-emoji {
  font-size: 32rpx;
  width: 40rpx;
  text-align: center;
}

.menu-label {
  font-size: 28rpx;
  color: #333;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.agreed-tag {
  font-size: 22rpx;
  color: #07c160;
  background-color: #f0faf4;
  border: 1rpx solid #b7ebd0;
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
  line-height: 1.4;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
  line-height: 1;
}

/* 退出登录 */
.logout-wrap {
  margin: 60rpx 24rpx 0;
}

.btn-logout {
  width: 100%;
  height: 88rpx;
  background: #ffffff;
  color: #ff4d4f;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: 1rpx solid #ffd6d6;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 10rpx rgba(255, 77, 79, 0.08);
}
</style>
