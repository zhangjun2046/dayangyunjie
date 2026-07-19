<template>
  <view class="page">
    <!-- 顶部蓝色状态区 -->
    <view class="status-header">
      <text class="status-title">服务已完成</text>
      <text class="status-subtitle">请核对清洁情况并对阿姨的服务打分</text>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <!-- 满意度评分卡片 -->
      <view class="card">
        <text class="card-title">您对本次服务满意吗？</text>

        <!-- 星级选择 -->
        <view class="stars-row">
          <view
            v-for="n in 5"
            :key="n"
            class="star-wrap"
            @tap="onSelectStar(n)"
          >
            <text class="star" :class="n <= rating ? 'star-active' : 'star-inactive'">★</text>
          </view>
        </view>

        <!-- 快捷标签 -->
        <view class="tags-row">
          <view
            v-for="tag in REVIEW_TAGS"
            :key="tag"
            class="tag-chip"
            :class="selectedTags.includes(tag) ? 'tag-chip-active' : ''"
            @tap="onToggleTag(tag)"
          >
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 文字评价卡片 -->
      <view class="card">
        <textarea
          class="review-textarea"
          v-model="content"
          placeholder="清洁得非常干净，细节处理也很到位，下次还会预约这位阿姨……"
          placeholder-class="textarea-placeholder"
          :maxlength="1000"
          auto-height
        />

        <!-- 图片上传区 -->
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
            <text class="img-add-text">添加图片</text>
          </view>
        </view>
        <view v-if="uploadingCount > 0" class="uploading-tip">
          <text class="uploading-text">图片上传中 {{ uploadingCount }} 张…</text>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="action-bar">
      <button
        class="btn-submit"
        :disabled="submitting || rating === 0 || uploadingCount > 0"
        @tap="onSubmit"
      >
        {{ submitting ? '提交中…' : '提交评价' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import { submitReview } from '@/api/review';
import { uploadImage } from '@/api/upload';

const REVIEW_TAGS = ['准时到达', '打扫干净', '态度好', '专业细致', '工具齐全', '着装整齐'];
const MAX_IMAGES = 9;

const authStore = useAuthStore();

const orderId = ref(0);
const orderType = ref<'CLEANING' | 'RECYCLING'>('CLEANING');
const orderNo = ref('');

const rating = ref(0);
const selectedTags = ref<string[]>([]);
const content = ref('');
const uploadedImageUrls = ref<string[]>([]);
const previewImages = ref<string[]>([]);
const uploadingCount = ref(0);
const submitting = ref(false);

onLoad((options) => {
  const opts = options as Record<string, string>;
  orderId.value = parseInt(opts?.orderId || '0', 10);
  orderType.value = (opts?.orderType?.toUpperCase() as 'CLEANING' | 'RECYCLING') || 'CLEANING';
  orderNo.value = opts?.orderNo || '';
  console.info(`[review] onLoad orderId=${orderId.value} type=${orderType.value}`);
});

function onSelectStar(n: number) {
  rating.value = n;
  console.info(`[review] star selected=${n}`);
}

function onToggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag);
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(tag);
  }
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
          console.info('[review] image uploaded', url);
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
  if (rating.value === 0) {
    uni.showToast({ title: '请选择评分', icon: 'none' });
    return;
  }
  const residentId = authStore.resident?.id;
  if (!residentId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  if (uploadingCount.value > 0) {
    uni.showToast({ title: '请等待图片上传完成', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await submitReview({
      orderId: orderId.value,
      orderType: orderType.value,
      residentId,
      rating: rating.value,
      tags: selectedTags.value.length ? selectedTags.value : undefined,
      content: content.value.trim() || undefined,
      images: uploadedImageUrls.value.length ? uploadedImageUrls.value : undefined,
    });
    uni.showToast({ title: '评价成功', icon: 'success' });
    console.info(`[review] submitted orderId=${orderId.value} rating=${rating.value}`);
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e) {
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

/* 顶部蓝色标题 */
.status-header {
  background: #1677ff;
  padding: 40rpx 32rpx 36rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}

.status-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.content-scroll {
  flex: 1;
}

/* 通用卡片 */
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
  margin-bottom: 28rpx;
  text-align: center;
}

/* 星级 */
.stars-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.star-wrap {
  padding: 8rpx;
}

.star {
  font-size: 72rpx;
  line-height: 1;
}

.star-active {
  color: #faad14;
}

.star-inactive {
  color: #e0e0e0;
}

/* 标签 */
.tags-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
}

.tag-chip {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  border: 1rpx solid #d9d9d9;
  background: #f7f7f7;
}

.tag-chip-active {
  border-color: #1677ff;
  background: #e8f1ff;
}

.tag-text {
  font-size: 26rpx;
  color: #555;
}

.tag-chip-active .tag-text {
  color: #1677ff;
  font-weight: 600;
}

/* 文字框 */
.review-textarea {
  width: 100%;
  min-height: 160rpx;
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
  margin-top: 24rpx;
}

.img-item {
  position: relative;
  width: 180rpx;
  height: 180rpx;
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
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d9d9d9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.img-add-icon {
  width: 48rpx;
  height: 48rpx;
}

.img-add-text {
  font-size: 22rpx;
  color: #bbb;
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
  background: #1677ff;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-submit[disabled] {
  background: #b0c9f5;
}
</style>
