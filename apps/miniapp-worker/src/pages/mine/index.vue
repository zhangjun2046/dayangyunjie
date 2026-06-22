<template>
  <view class="page">
    <!-- 个人信息卡片 -->
    <view class="profile-card">
      <view class="avatar-wrap">
        <image class="avatar" src="/static/images/worker-avatar.png" mode="aspectFill" />
      </view>
      <view class="profile-info">
        <text class="profile-name">{{ workerName }}</text>
        <text class="profile-rating">评分：{{ displayRating }}（{{ detail?.totalOrders ?? 0 }}单）</text>
      </view>
    </view>

    <!-- 统计双卡：今日订单 / 已完成 -->
    <view class="stats-row">
      <view class="stat-card" @tap="onGoTasks">
        <view class="stat-icon-wrap">
          <text class="stat-icon">📋</text>
        </view>
        <view class="stat-body">
          <text class="stat-label">今日订单</text>
          <text class="stat-value">{{ todayCount }}</text>
        </view>
      </view>
      <view class="stat-card" @tap="onGoTasks">
        <view class="stat-icon-wrap completed">
          <text class="stat-icon">✅</text>
        </view>
        <view class="stat-body">
          <text class="stat-label">已完成</text>
          <text class="stat-value">{{ todayDoneCount }}</text>
        </view>
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
      <view class="menu-item" @tap="onGoSettings">
        <view class="menu-left">
          <text class="menu-icon">⚙</text>
          <text class="menu-label">设置</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="onViewPrivacy">
        <view class="menu-left">
          <text class="menu-icon">📄</text>
          <text class="menu-label">用户协议与隐私政策</text>
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
import { fetchWorkerDetail, type WorkerDetailDto } from '@/api/worker';
import { fetchWorkerOrders } from '@/api/order';

const authStore = useAuthStore();

/** 员工详情（从后端获取） */
const detail = ref<WorkerDetailDto | null>(null);
/** 今日订单数（保洁 + 废品，appointDate = 今天，任意可见状态） */
const todayCount = ref<number>(0);
/** 今日已完成数（保洁 + 废品，appointDate = 今天，status = REVIEWED） */
const todayDoneCount = ref<number>(0);
/** 加载中标志 */
const loading = ref(false);

const workerName = computed(() => detail.value?.name ?? authStore.worker?.name ?? '');
const displayRating = computed(() => {
  const r = detail.value?.rating ?? 0;
  return r > 0 ? r.toFixed(1) : '暂无';
});

/** 获取今日 ISO 日期前缀 YYYY-MM-DD */
function getTodayPrefix(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 规范化 appointDate 为 YYYY-MM-DD 格式（兼容点分格式 2026.06.22） */
function normalizeDate(dateStr: string): string {
  return dateStr.replace(/\./g, '-').slice(0, 10);
}

/** 加载员工详情、今日订单数、今日已完成数 */
async function loadData() {
  const workerId = authStore.worker?.id;
  if (!workerId) return;
  if (loading.value) return;
  loading.value = true;
  try {
    // 后端 pageSize 最大 100；普通员工单日订单不超过此量级
    const [workerDetail, cleaningResult, recyclingResult] = await Promise.all([
      fetchWorkerDetail(workerId),
      fetchWorkerOrders(workerId, 'cleaning', [], 1, 100),
      fetchWorkerOrders(workerId, 'recycling', [], 1, 100),
    ]);
    detail.value = workerDetail;

    const todayPrefix = getTodayPrefix();
    const allItems = [...cleaningResult.items, ...recyclingResult.items];

    // 今日订单：appointDate = 今天（任意可见状态）
    const todayItems = allItems.filter((o) => normalizeDate(o.appointDate) === todayPrefix);
    todayCount.value = todayItems.length;

    // 今日已完成：appointDate = 今天 且 status = REVIEWED
    todayDoneCount.value = todayItems.filter((o) => o.status === 'REVIEWED').length;

    console.info(
      '[mine] loadData done, todayCount=', todayCount.value,
      'todayDone=', todayDoneCount.value,
    );
  } catch (err) {
    console.info('[mine] loadData error', err);
  } finally {
    loading.value = false;
  }
}

/** 每次页面显示时刷新数据 */
onShow(() => {
  loadData();
});

onMounted(() => {
  loadData();
});

/** 跳转任务列表 */
function onGoTasks() {
  uni.switchTab({ url: '/pages/tasks/index' });
  console.info('[mine] go tasks tab');
}

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

/** 跳转设置页 */
function onGoSettings() {
  uni.navigateTo({ url: '/pages/settings/index' });
  console.info('[mine] go settings');
}

/** 查看隐私协议（占位） */
function onViewPrivacy() {
  uni.showToast({ title: '用户协议与隐私政策即将上线', icon: 'none' });
  console.info('[mine] view privacy placeholder');
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
  background: #f0f5ff;
  padding-bottom: 60rpx;
}

/* ── 个人信息卡片 ── */
.profile-card {
  background: linear-gradient(135deg, #ddeeff 0%, #f0f5ff 100%);
  padding: 60rpx 40rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
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
  box-shadow: 0 4rpx 16rpx rgba(22, 119, 255, 0.15);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.profile-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.profile-rating {
  font-size: 26rpx;
  color: #555;
}

/* ── 统计双卡 ── */
.stats-row {
  display: flex;
  gap: 20rpx;
  margin: 24rpx 24rpx 0;
}

.stat-card {
  flex: 1;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.stat-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #e8f1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap.completed {
  background: #e8f8e8;
}

.stat-icon {
  font-size: 34rpx;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #888;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #1677ff;
  line-height: 1.2;
}

/* ── 证书卡片 ── */
.section-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin: 24rpx 24rpx 0;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
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
  background: #f0f5ff;
  border: 1rpx solid #c8d8f0;
  border-radius: 40rpx;
  padding: 12rpx 28rpx;
}

.cert-tag-text {
  font-size: 26rpx;
  color: #1677ff;
}

.cert-tag-arrow {
  font-size: 30rpx;
  color: #1677ff;
  line-height: 1;
}

/* ── 菜单组 ── */
.menu-group {
  background: #ffffff;
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
</style>
