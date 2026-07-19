<template>
  <view class="page">
    <!-- 地址列表 -->
    <view v-if="!loading && addresses.length === 0" class="empty-wrap">
      <text class="empty-text">暂无地址，请添加新地址</text>
    </view>

    <scroll-view v-else class="list-scroll" scroll-y>
      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="addr-card"
      >
        <view class="addr-body">
          <image class="addr-icon" src="/static/icons/address-card.png" mode="aspectFit" />
          <view class="addr-main">
            <view class="addr-header">
              <text class="addr-name">{{ addr.contactName }}</text>
              <text class="addr-phone">{{ addr.contactPhone }}</text>
              <view v-if="addr.isDefault" class="default-badge">
                <text class="default-text">默认</text>
              </view>
            </view>
            <text class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</text>
          </view>
        </view>
        <view class="addr-actions">
          <view
            v-if="!addr.isDefault"
            class="action-btn"
            @tap="onSetDefault(addr.id)"
          >
            <text class="action-text">设为默认</text>
          </view>
          <view class="action-btn" @tap="onEdit(addr)">
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn action-delete" @tap="onDelete(addr.id)">
            <text class="action-text-delete">删除</text>
          </view>
        </view>
      </view>
      <view class="bottom-placeholder" />
    </scroll-view>

    <!-- 悬浮添加按钮 -->
    <view class="fab-wrap">
      <view class="fab-btn" @tap="onOpenAdd">
        <text class="fab-icon">+</text>
        <text class="fab-text">添加新地址</text>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showModal" class="modal-mask" @tap="onCloseModal">
      <view class="modal-box" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑地址' : '添加地址' }}</text>
          <text class="modal-close" @tap="onCloseModal">×</text>
        </view>

        <scroll-view class="modal-scroll" scroll-y>
          <view class="form-item">
            <text class="form-label">联系人</text>
            <input class="form-input" v-model="form.contactName" placeholder="请输入联系人姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input class="form-input" v-model="form.contactPhone" placeholder="请输入手机号" type="number" :maxlength="11" />
          </view>
          <view class="form-item">
            <text class="form-label">省</text>
            <input class="form-input" v-model="form.province" placeholder="如：广东省" />
          </view>
          <view class="form-item">
            <text class="form-label">市</text>
            <input class="form-input" v-model="form.city" placeholder="如：深圳市" />
          </view>
          <view class="form-item">
            <text class="form-label">区/县</text>
            <input class="form-input" v-model="form.district" placeholder="如：南山区" />
          </view>
          <view class="form-item">
            <text class="form-label">详细地址</text>
            <input class="form-input" v-model="form.detail" placeholder="街道/小区/楼栋/门牌号" />
          </view>
          <view class="form-item form-switch-row">
            <text class="form-label">设为默认</text>
            <switch :checked="form.isDefault" @change="(e: any) => (form.isDefault = e.detail.value)" color="#1677ff" />
          </view>
        </scroll-view>

        <view class="modal-footer">
          <button class="btn-save" :disabled="saving" @tap="onSave">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressDto,
} from '@/api/address';

const authStore = useAuthStore();

const loading = ref(false);
const addresses = ref<AddressDto[]>([]);
const showModal = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  contactName: '',
  contactPhone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
});

onShow(async () => {
  await loadAddresses();
});

async function loadAddresses() {
  const residentId = authStore.resident?.id;
  if (!residentId) return;
  loading.value = true;
  try {
    addresses.value = await fetchAddresses(residentId);
    console.info(`[address-manage] loaded ${addresses.value.length} addresses`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.contactName = '';
  form.contactPhone = '';
  form.province = '';
  form.city = '';
  form.district = '';
  form.detail = '';
  form.isDefault = false;
}

function onOpenAdd() {
  editingId.value = null;
  resetForm();
  showModal.value = true;
}

function onEdit(addr: AddressDto) {
  editingId.value = addr.id;
  form.contactName = addr.contactName;
  form.contactPhone = addr.contactPhone;
  form.province = addr.province;
  form.city = addr.city;
  form.district = addr.district;
  form.detail = addr.detail;
  form.isDefault = addr.isDefault;
  showModal.value = true;
}

function onCloseModal() {
  showModal.value = false;
  editingId.value = null;
  resetForm();
}

async function onSave() {
  if (!form.contactName.trim()) {
    uni.showToast({ title: '请填写联系人', icon: 'none' });
    return;
  }
  if (!form.contactPhone.trim()) {
    uni.showToast({ title: '请填写手机号', icon: 'none' });
    return;
  }
  if (!form.detail.trim()) {
    uni.showToast({ title: '请填写详细地址', icon: 'none' });
    return;
  }

  const residentId = authStore.resident?.id;
  if (!residentId) return;

  saving.value = true;
  try {
    if (editingId.value) {
      await updateAddress(editingId.value, {
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        detail: form.detail.trim(),
        isDefault: form.isDefault,
      });
      console.info(`[address-manage] updated id=${editingId.value}`);
    } else {
      await createAddress({
        residentId,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        detail: form.detail.trim(),
        isDefault: form.isDefault,
      });
      console.info('[address-manage] created new address');
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    onCloseModal();
    await loadAddresses();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    saving.value = false;
  }
}

async function onSetDefault(id: number) {
  try {
    await setDefaultAddress(id);
    console.info(`[address-manage] set default id=${id}`);
    await loadAddresses();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '操作失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

async function onDelete(id: number) {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      success: (res) => resolve(res.confirm),
    });
  });
  if (!confirmed) return;
  try {
    await deleteAddress(id);
    console.info(`[address-manage] deleted id=${id}`);
    await loadAddresses();
    uni.showToast({ title: '已删除', icon: 'success' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
}

.empty-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 160rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.list-scroll {
  flex: 1;
  padding: 0 0 0;
}

.addr-card {
  background: #ffffff;
  margin: 20rpx 24rpx 0;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.addr-body {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.addr-icon {
  width: 40rpx;
  height: 40rpx;
  margin-top: 4rpx;
  flex-shrink: 0;
}

.addr-main {
  flex: 1;
}

.addr-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.addr-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
}

.addr-phone {
  font-size: 26rpx;
  color: #555;
}

.default-badge {
  background: #e8f1ff;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.default-text {
  font-size: 22rpx;
  color: #1677ff;
}

.addr-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.addr-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
  border-top: 1rpx solid #f5f5f5;
  padding-top: 16rpx;
}

.action-btn {
  padding: 8rpx 0;
}

.action-text {
  font-size: 26rpx;
  color: #1677ff;
}

.action-delete {
  margin-left: auto;
}

.action-text-delete {
  font-size: 26rpx;
  color: #ff4d4f;
}

.bottom-placeholder {
  height: 200rpx;
}

/* 悬浮添加按钮 */
.fab-wrap {
  position: fixed;
  bottom: 60rpx;
  left: 32rpx;
  right: 32rpx;
}

.fab-btn {
  background: #1677ff;
  border-radius: 44rpx;
  height: 88rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(22, 119, 255, 0.4);
}

.fab-icon {
  font-size: 40rpx;
  color: #ffffff;
  line-height: 1;
}

.fab-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.modal-box {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
}

.modal-close {
  font-size: 44rpx;
  color: #999;
  line-height: 1;
}

.modal-scroll {
  flex: 1;
  padding: 0 32rpx;
}

.form-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.form-switch-row {
  justify-content: space-between;
}

.form-label {
  font-size: 28rpx;
  color: #555;
  width: 130rpx;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.modal-footer {
  padding: 24rpx 32rpx 40rpx;
}

.btn-save {
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

.btn-save[disabled] {
  background: #b0c9f5;
}
</style>
