<template>
  <view class="page">
    <!-- 沉浸式顶部：浅蓝渐变顶到状态栏 -->
    <view class="mine-header">
      <view class="mine-header-bg" />
      <uni-nav-bar
        status-bar
        :border="false"
        background-color="transparent"
      />
      <view class="profile-card">
        <view class="avatar-wrap">
          <image class="avatar" src="/static/images/worker-avatar.png" mode="aspectFill" />
        </view>
        <view class="profile-info">
          <text class="profile-name">{{ workerName }}</text>
          <text class="profile-rating">评分：{{ displayRating }}（{{ detail?.totalOrders ?? 0 }}单）</text>
        </view>
      </view>
    </view>

    <!-- 统计双卡：今日订单 / 已完成 -->
    <view class="stats-row">
      <view class="stat-card">
        <view class="stat-text">
          <text class="stat-label">今日已完成</text>
          <text class="stat-value">{{ detail?.todayOrders ?? 0 }}</text>
        </view>
        <image
          class="stat-icon"
          src="/static/icons/icon_today_order_n.png"
          mode="aspectFit"
        />
      </view>
      <view class="stat-card">
        <view class="stat-text">
          <text class="stat-label">累计已完成</text>
          <text class="stat-value">{{ detail?.totalOrders ?? 0 }}</text>
        </view>
        <image
          class="stat-icon"
          src="/static/icons/icon_today_done_n.png"
          mode="aspectFit"
        />
      </view>
    </view>

    <!-- 我的证书 -->
    <view class="section-card">
      <view class="section-title">我的证书</view>
      <view class="cert-row">
        <view class="cert-tag" @tap="onViewCert('health')">
          <text class="cert-tag-text">健康证</text>
          <text class="cert-tag-arrow">›</text>
        </view>
        <view class="cert-tag" @tap="onViewCert('skill')">
          <text class="cert-tag-text">技能证书</text>
          <text class="cert-tag-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 菜单组 -->
    <view class="menu-group">
      <view class="menu-item" @tap="onGoChangePassword">
        <view class="menu-left">
          <!-- 待补充：修改密码图标 → /static/icons/icon_password_n.png -->
          <image class="menu-icon" src="/static/icons/icon_password_n.png" mode="aspectFit" />
          <text class="menu-label">修改密码</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onViewAgreement">
        <view class="menu-left">
          <image class="menu-icon" src="/static/icons/privacy-shield.png" mode="aspectFit" />
          <text class="menu-label">协议与隐私</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-wrap">
      <button class="btn-logout" @tap="onLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { ensureAuthed } from '@/composables/useRouteGuard';
import { fetchWorkerDetail, type WorkerDetailDto } from '@/api/worker';

const authStore = useAuthStore();

/** 员工详情（从后端获取） */
const detail = ref<WorkerDetailDto | null>(null);
/** 加载中标志 */
const loading = ref(false);

const workerName = computed(() => detail.value?.name ?? authStore.worker?.name ?? '');
const displayRating = computed(() => {
  const r = detail.value?.rating ?? 0;
  return r > 0 ? r.toFixed(1) : '暂无';
});

/** 加载员工详情及服务统计 */
async function loadData() {
  const workerId = authStore.worker?.id;
  if (!workerId) return;
  if (loading.value) return;
  loading.value = true;
  try {
    const workerDetail = await fetchWorkerDetail(workerId);
    detail.value = workerDetail;
    console.info('[mine] loadData done', workerDetail);
  } catch (err) {
    console.info('[mine] loadData error', err);
  } finally {
    loading.value = false;
  }
}

/** 每次页面显示时刷新数据 */
onShow(async () => {
  const ok = await ensureAuthed();
  if (!ok) return;
  loadData();
});

onMounted(() => {
  loadData();
});

/** 查看证书大图 */
function onViewCert(type: 'health' | 'skill') {
  const url = type === 'health' ? detail.value?.healthCertUrl : detail.value?.skillCertUrl;
  const label = type === 'health' ? '健康证' : '技能证书';
  if (!url) {
    uni.showToast({ title: `${label}暂未上传`, icon: 'none' });
    console.info('[mine] cert not uploaded, type=', type);
    return;
  }
  uni.previewImage({ urls: [url], current: url });
  console.info('[mine] preview cert, type=', type, 'url=', url);
}

/** 跳转修改密码页 */
function onGoChangePassword() {
  uni.navigateTo({ url: '/pages/change-password/index' });
  console.info('[mine] go change-password');
}

/** 查看协议与隐私 */
function onViewAgreement() {
  uni.navigateTo({ url: '/pages/agreement/index' });
  console.info('[mine] go agreement');
}

/** 退出登录 */
function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success(res) {
      if (res.confirm) {
        authStore.logout();
        console.info('[mine] user logged out');
        uni.redirectTo({ url: '/pages/login/index' });
      }
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F8FAFF;
  padding-bottom: 60rpx;
}

/* ── 沉浸式顶部（对齐居民端 mine：保留导航占位后再放头像） ── */
.mine-header {
  position: relative;
  overflow: hidden;
  padding-bottom: 8rpx;
}

.mine-header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: linear-gradient(180deg, #BFD9FF 0%, #DCEAFF 40%, #F8FAFF 100%);
}

.mine-header :deep(.uni-navbar) {
  position: relative;
  z-index: 1;
}

.profile-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 24rpx 40rpx 48rpx;
  background: transparent;
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #c8d8f0;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.12);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.profile-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333333;
}

.profile-rating {
  font-size: 26rpx;
  color: #58636A;
}

/* ── 统计双卡（对齐设计稿：左文右图） ── */
.stats-row {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  margin: 0 24rpx;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 28rpx 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.08);
  min-height: 140rpx;
  box-sizing: border-box;
}

.stat-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stat-label {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.3;
}

.stat-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}

/* ── 证书卡片 ── */
.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin: 24rpx 24rpx 0;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.06);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 44rpx;
}

.cert-row {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.cert-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #E3F3FF;
  border-radius: 8rpx;
  padding: 14rpx 28rpx;
}

.cert-tag-text {
  font-size: 26rpx;
  color: #59646B;
}

.cert-tag-arrow {
  font-size: 30rpx;
  color: #59646B;
  line-height: 1;
}

/* ── 菜单组 ── */
.menu-group {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  margin: 24rpx 24rpx 0;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.06);
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
  align-items: center;
  gap: 18rpx;
}

.menu-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  font-size: 32rpx;
  text-align: center;
  line-height: 36rpx;
}

.menu-label {
  font-size: 28rpx;
  color: #040C13;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
  line-height: 1;
}

/* ── 退出登录 ── */
.logout-wrap {
  margin: 40rpx 24rpx 0;
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

.btn-logout::after {
  border: none;
}
</style>
