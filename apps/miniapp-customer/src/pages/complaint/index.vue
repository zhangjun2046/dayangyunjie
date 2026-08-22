<template>
  <view class="page">
    <scroll-view class="content-scroll" scroll-y>
      <!-- 投诉原因 -->
      <view class="card">
        <text class="card-title">投诉原因</text>
        <view class="reason-grid">
          <view
            v-for="item in reasonOptions"
            :key="item.value"
            class="reason-chip"
            :class="selectedReasonConfigId === item.value ? 'reason-chip-active' : ''"
            @tap="onSelectReason(item.value)"
          >
            <text class="reason-text">{{ item.label }}</text>
          </view>
          <text v-if="reasonsLoading" class="reason-empty">投诉原因加载中…</text>
          <text v-else-if="reasonOptions.length === 0" class="reason-empty">
            {{ reasonSource === 'unavailable' ? '投诉原因加载失败，请稍后重试' : '暂无可用投诉原因' }}
          </text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="card">
        <text class="card-title">问题描述</text>
        <textarea
          class="desc-textarea"
          v-model="description"
          placeholder="请详细描述您遇到的问题，我们将尽快为您处理…"
          placeholder-class="textarea-placeholder"
          :maxlength="1000"
          auto-height
        />
      </view>

      <!-- 上传凭证 -->
      <view class="card">
        <text class="card-title">上传凭证</text>
        <view class="image-section">
          <view
            v-for="(imgUrl, idx) in previewImages"
            :key="idx"
            class="img-item"
          >
            <image class="img-thumb" :src="imgUrl" mode="aspectFill" />
            <view class="img-delete" @tap="onRemoveImage(idx)">
              <text class="img-delete-icon">×</text>
            </view>
          </view>
          <view
            v-if="previewImages.length < MAX_IMAGES"
            class="img-add"
            @tap="onChooseImage"
          >
            <image class="img-add-icon" src="/static/icons/add-photo.png" mode="aspectFit" />
          </view>
        </view>
        <view v-if="uploadingCount > 0" class="uploading-tip">
          <text class="uploading-text">图片上传中 {{ uploadingCount }} 张…</text>
        </view>
      </view>

      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="action-bar">
      <button
        class="btn-submit"
        :disabled="!isSubmitAvailable"
        @tap="onSubmit"
      >
        {{ submitting ? '提交中…' : '提交投诉' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { submitComplaint } from '@/api/complaint';
import { uploadImage } from '@/api/upload';
import { useComplaintReasons } from '@/composables/use-complaint-reasons';
import { useAuthStore } from '@/store/auth';
import {
  canSubmitComplaint,
  recoverUnavailableComplaintReason,
  retainAvailableComplaintReason,
} from './complaint-form';

const MAX_IMAGES = 5;
const authStore = useAuthStore();
const {
  options: reasonOptions,
  source: reasonSource,
  loading: reasonsLoading,
  load: loadComplaintReasons,
  isAvailable: isReasonAvailable,
  markUnavailable: markReasonUnavailable,
} = useComplaintReasons();

const orderId = ref(0);
const orderType = ref<'CLEANING' | 'RECYCLING' | 'CONSULT'>('CLEANING');
const orderNo = ref('');

const selectedReasonConfigId = ref<number | null>(null);
const description = ref('');
const uploadedImageUrls = ref<string[]>([]);
const previewImages = ref<string[]>([]);
const uploadingCount = ref(0);
const submitting = ref(false);
const isSubmitAvailable = computed(() =>
  canSubmitComplaint({
    selectedReasonConfigId: selectedReasonConfigId.value,
    description: description.value,
    uploadingCount: uploadingCount.value,
    availableReasonCount: reasonOptions.value.length,
    submitting: submitting.value,
  }),
);

onLoad((options) => {
  const opts = options as Record<string, string>;
  orderId.value = parseInt(opts?.orderId || '0', 10);
  orderType.value =
    (opts?.orderType?.toUpperCase() as 'CLEANING' | 'RECYCLING' | 'CONSULT') || 'CLEANING';
  orderNo.value = opts?.orderNo || '';
  console.info(`[complaint] onLoad orderId=${orderId.value} type=${orderType.value}`);
  void loadComplaintReasons().then(() => {
    selectedReasonConfigId.value = retainAvailableComplaintReason(
      selectedReasonConfigId.value,
      isReasonAvailable,
    );
  });
});

function onSelectReason(id: number) {
  selectedReasonConfigId.value = id;
}

function onChooseImage() {
  const remain = MAX_IMAGES - previewImages.value.length;
  if (remain <= 0) return;
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const paths = res.tempFilePaths;
      for (const path of paths) {
        previewImages.value.push(path);
        uploadingCount.value += 1;
        try {
          const url = await uploadImage(path, orderNo.value || undefined);
          uploadedImageUrls.value.push(url);
          console.info('[complaint] evidence uploaded', url);
        } catch (e) {
          const msg = e instanceof Error ? e.message : '上传失败';
          uni.showToast({ title: msg, icon: 'none' });
          const pidx = previewImages.value.indexOf(path);
          if (pidx >= 0) previewImages.value.splice(pidx, 1);
        } finally {
          uploadingCount.value -= 1;
        }
      }
    },
  });
}

function onRemoveImage(idx: number) {
  previewImages.value.splice(idx, 1);
  uploadedImageUrls.value.splice(idx, 1);
}

async function onSubmit() {
  if (selectedReasonConfigId.value === null) {
    uni.showToast({ title: '请选择投诉原因', icon: 'none' });
    return;
  }
  if (!description.value.trim()) {
    uni.showToast({ title: '请填写问题描述', icon: 'none' });
    return;
  }
  if (uploadingCount.value > 0) {
    uni.showToast({ title: '请等待图片上传完成', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await submitComplaint({
      orderType: orderType.value,
      orderId: orderId.value,
      reasonConfigId: selectedReasonConfigId.value,
      description: description.value.trim(),
      evidenceImages: uploadedImageUrls.value.length ? uploadedImageUrls.value : undefined,
      residentId: authStore.resident?.id ?? undefined,
    });
    uni.showToast({ title: '投诉已提交', icon: 'success' });
    console.info(
      `[complaint] submitted orderId=${orderId.value} reasonConfigId=${selectedReasonConfigId.value}`,
    );
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e) {
    const recovered = await recoverUnavailableComplaintReason(e, selectedReasonConfigId.value, {
      clearSelection: () => {
        selectedReasonConfigId.value = null;
      },
      reload: loadComplaintReasons,
      markUnavailable: markReasonUnavailable,
    });
    if (recovered) {
      uni.showToast({ title: '该投诉原因已不可用，请重新选择', icon: 'none' });
      console.info('[complaint] unavailable reason refreshed');
      return;
    }
    const msg = e instanceof Error ? e.message : '提交失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.content-scroll {
  flex: 1;
}

.card {
  background: #ffffff;
  margin: 20rpx 0 0;
  padding: 36rpx 32rpx 28rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
  display: block;
  margin-bottom: 24rpx;
}

/* 投诉原因网格 */
.reason-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 20rpx;
}

.reason-chip {
  padding: 14rpx 28rpx;
  border-radius: 32rpx;
  border: 1rpx solid #d9d9d9;
  background: #f7f7f7;
}

.reason-chip-active {
  border-color: #236EFF;
  background: #236EFF;
}

.reason-text {
  font-size: 26rpx;
  color: #555;
}

.reason-chip-active .reason-text {
  color: #ffffff;
  font-weight: 600;
}

.reason-empty {
  font-size: 26rpx;
  color: #999;
}

/* 描述文字框 */
.desc-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.7;
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  box-sizing: border-box;
}

.textarea-placeholder {
  color: #bbb;
}

/* 图片上传 */
.image-section {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}

.img-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.img-thumb {
  width: 100%;
  height: 100%;
}

.img-delete {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-delete-icon {
  font-size: 28rpx;
  color: #fff;
  line-height: 1;
}

.img-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d9d9d9;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-add-icon {
  width: 60rpx;
  height: 60rpx;
}

.uploading-tip {
  margin-top: 12rpx;
}

.uploading-text {
  font-size: 24rpx;
  color: #fa8c16;
}

.bottom-placeholder {
  height: 160rpx;
}

/* 底部操作栏 */
.action-bar {
  padding: 24rpx 32rpx;
  background: #ffffff;
  border-top: 1rpx solid #f0f0f0;
}

.btn-submit {
  width: 100%;
  height: 88rpx;
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
	border-radius: 20rpx;
  color: #ffffff;
  font-size: 30rpx;
	font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}


.btn-submit[disabled] {
  background: #b0c9f5;
	color: #ffffff;
}
</style>
