<template>
  <view class="page">
    <!-- 头部服务标识 -->
    <view class="service-hero" :class="heroClass">
      <view class="hero-inner">
        <view class="hero-icon-wrap">
          <image class="hero-icon" :src="serviceInfo.icon" mode="aspectFit" />
        </view>
        <text class="hero-title">{{ serviceInfo.name }}</text>
        <text class="hero-tagline">{{ serviceInfo.tagline }}</text>
      </view>
    </view>

    <!-- 服务说明 -->
    <view class="section">
      <view class="section-title-row">
        <view class="section-indicator" />
        <text class="section-title">服务说明</text>
      </view>
      <view class="desc-card">
        <view
          v-for="(item, index) in serviceInfo.descItems"
          :key="index"
          class="desc-item"
        >
          <view class="desc-dot" />
          <text class="desc-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- §1.6 边界声明 -->
    <view class="section">
      <view class="section-title-row">
        <view class="section-indicator warn" />
        <text class="section-title">服务须知与边界声明</text>
      </view>
      <view class="notice-card">
        <view
          v-for="(notice, index) in boundaryNotices"
          :key="index"
          class="notice-item"
        >
          <view class="notice-icon-wrap">
            <text class="notice-icon">{{ notice.icon }}</text>
          </view>
          <view class="notice-content">
            <text class="notice-title">{{ notice.title }}</text>
            <text class="notice-desc">{{ notice.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位，避免被固定按钮遮挡 -->
    <view class="page-bottom-padding" />

    <!-- 底部固定预约按钮 -->
    <view class="book-bar">
      <view class="book-btn" :class="bookBtnClass" @tap="onBook">立即预约</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useBookingCleaningStore } from '@/store/booking-cleaning';
import { useBookingRecyclingStore } from '@/store/booking-recycling';

/** 服务类型，来自页面 URL 参数 */
const serviceType = ref<'cleaning' | 'recycling' | 'consult'>('cleaning');

/** §1.6 边界声明 — 保洁服务 */
const CLEANING_BOUNDARY_NOTICES = [
  {
    icon: '🪟',
    title: '高空外窗清洁',
    desc: '本服务不含高空悬挂式外窗擦洗，如需外窗清洁请提前告知，由专项团队单独报价安排。',
  },
  {
    icon: '🧼',
    title: '顽固污渍处理',
    desc: '水渍、霉斑、油烟等顽固污渍的清洁效果因实际情况而异，服务员将尽力处理，但无法保证完全去除。',
  },
  {
    icon: '💎',
    title: '贵重物品保管',
    desc: '请在服务员上门前，提前收纳保管好现金、首饰、证件等贵重物品，以防遗失。',
  },
  {
    icon: '✅',
    title: '上门范围确认',
    desc: '服务员上门后将与您当面确认本次服务范围及注意事项，如有额外需求请提前沟通，避免产生误解。',
  },
];

/** §1.6 边界声明 — 废品回收 */
const RECYCLING_BOUNDARY_NOTICES = [
  {
    icon: '📦',
    title: '大件搬运准备',
    desc: '大件类废品需搬运工上门，请确保电梯或楼梯通道畅通可用，便于安全搬运。',
  },
  {
    icon: '⚖️',
    title: '预估重量说明',
    desc: '预约时填写的预估重量仅供安排搬运工具及人员，实际回收量以上门现场核定为准。',
  },
  {
    icon: '🚫',
    title: '回收品类范围',
    desc: '本服务不含危险废品、医疗废物、易燃易爆等特殊品类，如有疑问请提前预约时说明。',
  },
  {
    icon: '✅',
    title: '上门确认',
    desc: '回收员上门前会电话确认，到达后将与您当面核对回收物品及注意事项，避免遗漏或误解。',
  },
];

/** §1.6 边界声明 — 家政咨询 */
const CONSULT_BOUNDARY_NOTICES = [
  {
    icon: '📞',
    title: '电话回访',
    desc: '提交需求后，运营人员将在 15 分钟内电话回访，了解您的具体家政需求。',
  },
  {
    icon: '💡',
    title: '方案定制',
    desc: '家政服务需根据实际需求匹配专员，最终服务方案以电话沟通确认结果为准。',
  },
  {
    icon: '🔒',
    title: '隐私保护',
    desc: '您填写的联系信息仅用于需求跟进与服务安排，不会用于其他用途。',
  },
  {
    icon: '✅',
    title: '需求确认',
    desc: '顾问将与您确认服务类型、时间及注意事项，如有额外需求请提前沟通，避免理解偏差。',
  },
];

const BOUNDARY_NOTICE_MAP = {
  cleaning: CLEANING_BOUNDARY_NOTICES,
  recycling: RECYCLING_BOUNDARY_NOTICES,
  consult: CONSULT_BOUNDARY_NOTICES,
} as const;

const boundaryNotices = computed(
  () => BOUNDARY_NOTICE_MAP[serviceType.value] ?? CLEANING_BOUNDARY_NOTICES,
);

/** 各服务类型的静态展示信息 */
const SERVICE_MAP = {
  cleaning: {
    name: '保洁服务',
    tagline: '专业上门 · 品质保障',
    icon: '/static/icons/cleaning.svg',
    descItems: [
      '专业培训的保洁人员上门服务，持证上岗。',
      '使用环保清洁剂及专业工具，高效去污。',
      '服务时长可按需选择（2 ~ 8 小时），灵活安排。',
      '服务完成后员工拍照留存，保障服务质量可追溯。',
      '如对服务结果不满意，可在 7 天内发起评价或投诉。',
    ],
  },
  recycling: {
    name: '废品回收',
    tagline: '免费上门 · 绿色环保',
    icon: '/static/icons/recycling.svg',
    descItems: [
      '支持大件旧家电、小件废纸箱等多品类上门回收。',
      '服务员按预约时间准时到达，搬运工具齐全。',
      '回收全程规范操作，保障居住环境整洁。',
      '服务完成后由您确认验收，满意后流程结束。',
      '如对服务结果不满意，可在 7 天内发起投诉。',
    ],
  },
  consult: {
    name: '家政服务',
    tagline: '专业顾问 · 一站咨询',
    icon: '/static/icons/housekeeping.svg',
    descItems: [
      '填写服务需求后，运营人员将在 24 小时内电话回访。',
      '由专业顾问了解您的家政需求并制定方案。',
      '可咨询保姆、月嫂、老人陪护、家电维修等多类需求。',
      '电话回访确认后，由专项团队跟进安排上门服务。',
      '全程跟进记录，确保需求被妥善处理。',
    ],
  },
} as const;

const serviceInfo = computed(() => SERVICE_MAP[serviceType.value] ?? SERVICE_MAP.cleaning);

const heroClass = computed(() => ({
  'hero-blue': serviceType.value === 'cleaning',
  'hero-green': serviceType.value === 'recycling',
  'hero-orange': serviceType.value === 'consult',
}));

const bookBtnClass = computed(() => ({
  'btn-blue': serviceType.value === 'cleaning',
  'btn-green': serviceType.value === 'recycling',
  'btn-orange': serviceType.value === 'consult',
}));

onLoad((options?: Record<string, string>) => {
  const type = options?.type as 'cleaning' | 'recycling' | 'consult' | undefined;
  if (type && type in SERVICE_MAP) {
    serviceType.value = type;
  }
  console.info('[service-detail] loaded, type=', serviceType.value);
});

const bookingStore = useBookingCleaningStore();
const recyclingStore = useBookingRecyclingStore();

function onBook() {
  if (serviceType.value === 'cleaning') {
    bookingStore.reset();
    uni.navigateTo({ url: '/pages/booking-cleaning/index' });
    return;
  }
  if (serviceType.value === 'recycling') {
    recyclingStore.reset();
    uni.navigateTo({ url: '/pages/booking-recycling/index' });
    return;
  }
  uni.showToast({ title: '该服务预约功能即将上线', icon: 'none' });
}
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* ── 头部英雄区 ── */
.service-hero {
  width: 100%;
  padding: 60rpx 40rpx 52rpx;
  box-sizing: border-box;
}

.service-hero.hero-blue {
  background: linear-gradient(135deg, #1677ff 0%, #36cfc9 100%);
}

.service-hero.hero-green {
  background: linear-gradient(135deg, #07c160 0%, #36cfc9 100%);
}

.service-hero.hero-orange {
  background: linear-gradient(135deg, #fa8c16 0%, #fadb14 100%);
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.hero-icon {
  width: 64rpx;
  height: 64rpx;
}

.hero-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.hero-tagline {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 12rpx;
}

/* ── 通用 section ── */
.section {
  margin: 24rpx 24rpx 0;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.section-indicator {
  width: 8rpx;
  height: 36rpx;
  border-radius: 4rpx;
  background-color: #1677ff;
  flex-shrink: 0;
}

.section-indicator.warn {
  background-color: #fa8c16;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

/* ── 服务说明卡 ── */
.desc-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.desc-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.desc-item:last-child {
  margin-bottom: 0;
}

.desc-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #1677ff;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.desc-text {
  font-size: 28rpx;
  color: #444;
  line-height: 1.7;
  flex: 1;
}

/* ── 边界声明卡 ── */
.notice-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 8rpx 24rpx 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-icon-wrap {
  width: 68rpx;
  height: 68rpx;
  border-radius: 16rpx;
  background-color: #fff8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice-icon {
  font-size: 36rpx;
}

.notice-content {
  flex: 1;
  padding-top: 4rpx;
}

.notice-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8rpx;
}

.notice-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.7;
}

/* ── 底部预约按钮 ── */
.page-bottom-padding {
  height: 160rpx;
}

.book-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.book-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.book-btn.btn-blue {
  background: linear-gradient(90deg, #1677ff 0%, #36cfc9 100%);
}

.book-btn.btn-green {
  background: linear-gradient(90deg, #07c160 0%, #36cfc9 100%);
}

.book-btn.btn-orange {
  background: linear-gradient(90deg, #fa8c16 0%, #fadb14 100%);
}
</style>
