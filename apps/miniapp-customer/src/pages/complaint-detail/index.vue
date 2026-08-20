<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中…</text>
    </view>

    <view v-else-if="!complaint" class="loading-wrap">
      <text class="loading-text">投诉信息加载失败，请返回重试</text>
    </view>

    <scroll-view v-else class="content-scroll" scroll-y>
      <!-- 状态卡片 -->
      <view class="status-card" :class="getStatusCardClass(complaint.status)">
        <image class="status-bg" src="/static/images/icon_bj_n.png" mode="aspectFill" />
        <view class="status-header">
          <view class="status-badge">
            <text class="badge-text">{{ COMPLAINT_STATUS_LABELS[complaint.status] }}</text>
          </view>
          <text class="complaint-no">投诉 #{{ complaint.id }}</text>
        </view>
        <text class="status-desc">{{ getStatusDesc(complaint.status) }}</text>
      </view>

      <!-- 投诉详情 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">投诉信息</text>
        </view>
        <view class="info-row">
          <text class="info-label">投诉原因</text>
          <text class="info-value">
            {{ formatComplaintReasons(complaint.reasons) }}
          </text>
        </view>
        <view class="info-row">
          <text class="info-label">问题描述</text>
          <text class="info-value">{{ complaint.description }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ formatDateTime(complaint.createdAt) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">最后更新</text>
          <text class="info-value">{{ formatDateTime(complaint.updatedAt) }}</text>
        </view>
      </view>

      <!-- 凭证图片 -->
      <view v-if="complaint.evidenceImages && complaint.evidenceImages.length > 0" class="info-card">
        <view class="card-title-row">
          <text class="card-title">上传凭证</text>
        </view>
        <view class="image-grid">
          <RemoteImage
            v-for="(url, idx) in complaint.evidenceImages"
            :key="idx"
            class="evidence-img"
            :src="url"
            mode="aspectFill"
            variant="evidence"
            @tap="onPreviewImage(idx)"
          />
        </view>
      </view>

      <!-- 跟进记录 -->
      <view class="info-card">
        <view class="card-title-row">
          <text class="card-title">处理记录</text>
        </view>
        <view v-if="complaint.followUps && complaint.followUps.length > 0" class="timeline">
          <view
            v-for="(item, idx) in complaint.followUps"
            :key="item.id"
            class="timeline-item"
            :class="idx === complaint.followUps!.length - 1 ? 'timeline-item-last' : ''"
          >
            <view class="timeline-dot" />
            <view class="timeline-content">
              <view class="follow-header">
                <text class="handler-name">{{ item.handlerName }}</text>
                <text class="follow-time">{{ formatDateTime(item.createdAt) }}</text>
              </view>
              <text class="follow-content">{{ item.content }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-follow">
          <text class="empty-text">暂无处理记录，请耐心等待</text>
        </view>
      </view>

      <view class="bottom-placeholder" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import {
  getComplaintById,
  COMPLAINT_STATUS_LABELS,
  formatComplaintReasons,
  type ComplaintDto,
  type ComplaintFollowUpDto,
  type ComplaintStatus,
} from '@/api/complaint';
import RemoteImage from '@/components/RemoteImage.vue';
import { previewNetworkImages } from '@/utils/remote-image';

type ComplaintDetail = ComplaintDto & { followUps: ComplaintFollowUpDto[] };

const loading = ref(true);
const complaint = ref<ComplaintDetail | null>(null);
const complaintId = ref(0);

onLoad((options) => {
  complaintId.value = parseInt((options as Record<string, string>)?.complaintId || '0', 10);
  console.info(`[complaint-detail] onLoad complaintId=${complaintId.value}`);
  loadDetail();
});

async function loadDetail() {
  if (!complaintId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    complaint.value = await getComplaintById(complaintId.value);
    console.info(`[complaint-detail] loaded id=${complaintId.value} status=${complaint.value.status}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
    console.info('[complaint-detail] loadDetail error', e);
  } finally {
    loading.value = false;
  }
}

function onPreviewImage(startIndex: number) {
  if (!complaint.value?.evidenceImages) return;
  void previewNetworkImages(complaint.value.evidenceImages, startIndex);
}

function getStatusCardClass(status: ComplaintStatus): string {
  if (status === 'PENDING') return 'card-orange';
  if (status === 'PROCESSING') return 'card-blue';
  return 'card-green';
}

function getStatusDesc(status: ComplaintStatus): string {
  const map: Record<ComplaintStatus, string> = {
    PENDING: '您的投诉已提交，工作人员将尽快跟进处理',
    PROCESSING: '工作人员正在处理您的投诉，请耐心等待',
    COMPLETED: '您的投诉已处理完毕，感谢您的反馈',
  };
  return map[status] || '';
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8faff;
}

.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.content-scroll {
  flex: 1;
  height: 0;
}

/* 状态卡片 */
.status-card {
  position: relative;
  min-height: 220rpx;
  padding: 42rpx 38rpx 36rpx;
  margin-bottom: 4rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.status-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.card-orange {
  background: #fa8c16;
}

.card-blue {
  background: #236eff;
}

.card-green {
  background: #52c41a;
}

.status-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100rpx;
  height: 52rpx;
  padding: 0 22rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 27rpx;
  box-sizing: border-box;
}

.badge-text {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
}

.complaint-no {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.status-desc {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 30rpx;
  color: #ffffff;
  line-height: 1.6;
}

/* 信息卡片 */
.info-card {
  background: #ffffff;
  margin: 20rpx 24rpx;
  padding: 28rpx 32rpx;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.card-title-row {
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #efefef;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.info-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 22rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 30rpx;
  color: #4c5760;
  line-height: 1.6;
  margin-bottom: 2rpx;
}

.info-value {
  width: 100%;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.6;
  word-break: break-all;
}

/* 凭证图片 */
.image-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
}

.evidence-img {
  width: 196rpx;
  height: 196rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
}

/* 跟进时间轴 */
.timeline {
  padding: 4rpx 0 0 8rpx;
}

.timeline-item {
  display: flex;
  flex-direction: row;
  padding-bottom: 32rpx;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 17rpx;
  top: 30rpx;
  bottom: 0;
  width: 2rpx;
  background: #dbe8ff;
}

.timeline-item-last::before {
  display: none;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #236eff;
  box-shadow: 0 0 0 8rpx #eaf2ff;
  flex-shrink: 0;
  margin-top: 8rpx;
  margin-right: 20rpx;
  position: relative;
  z-index: 1;
}

.timeline-content {
  flex: 1;
}

.follow-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.handler-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.follow-time {
  font-size: 24rpx;
  color: #999999;
}

.follow-content {
  display: block;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #f8faff;
  font-size: 28rpx;
  color: #58636a;
  line-height: 1.6;
}

/* 无跟进记录 */
.empty-follow {
  padding: 36rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.bottom-placeholder {
  height: 40rpx;
}
</style>
