<template>
  <view class="page">
    <scroll-view class="content-scroll" scroll-y>
      <!-- 联系人 -->
      <view class="card">
        <view class="form-row">
          <text class="form-label">收货人</text>
          <input
            class="form-input"
            v-model="form.contactName"
            placeholder="请填写收货人姓名"
            placeholder-class="placeholder"
          />
        </view>
        <view class="form-row form-row-last">
          <text class="form-label">手机号</text>
          <input
            class="form-input"
            v-model="form.contactPhone"
            type="number"
            :maxlength="11"
            placeholder="请填写收货人手机号"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <!-- 地址 -->
      <view class="card">
        <picker
          mode="multiSelector"
          :range="pickerRange"
          :value="pickerIndex"
          @columnchange="onColumnChange"
          @change="onRegionChange"
        >
          <view class="form-row">
            <text class="form-label">所在地区</text>
            <view class="form-value-wrap">
              <text :class="regionText ? 'form-value' : 'form-placeholder'">
                {{ regionText || '省市区县、乡镇等' }}
              </text>
              <text class="chevron">›</text>
            </view>
          </view>
        </picker>
        <view class="form-row form-row-last form-row-top">
          <text class="form-label">详细地址</text>
          <textarea
            class="form-textarea"
            v-model="form.detail"
            placeholder="街道、楼牌号等"
            placeholder-class="placeholder"
            :maxlength="200"
            auto-height
          />
        </view>
      </view>

      <!-- 默认 -->
      <view class="card card-default">
        <view class="default-row" @tap="form.isDefault = !form.isDefault">
          <view class="default-left">
            <text class="default-title">设为默认地址</text>
            <text class="default-tip">提醒：下单时会优先使用该地址</text>
          </view>
          <view class="radio" :class="{ 'radio-checked': form.isDefault }">
            <view v-if="form.isDefault" class="radio-dot" />
          </view>
        </view>
      </view>

      <view class="bottom-placeholder" />
    </scroll-view>

    <view class="footer">
      <button class="btn-confirm" :disabled="saving" @tap="onConfirm">
        {{ saving ? '保存中…' : '确认' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useAuthStore } from '@/store/auth';
import {
  fetchAddresses,
  createAddress,
  updateAddress,
} from '@/api/address';

interface RegionCity {
  name: string;
  districts: string[];
}

interface RegionProvince {
  name: string;
  cities: RegionCity[];
}

/** 写死省市区数据源（后续可换接口） */
const REGION_DATA: RegionProvince[] = [
  {
    name: '北京市',
    cities: [
      {
        name: '北京市',
        districts: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
      },
    ],
  },
  {
    name: '广东省',
    cities: [
      { name: '深圳市', districts: ['南山区', '福田区', '罗湖区'] },
      { name: '广州市', districts: ['天河区', '越秀区'] },
    ],
  },
];

const authStore = useAuthStore();

const editingId = ref<number | null>(null);
const saving = ref(false);
const regionSelected = ref(false);

const form = reactive({
  contactName: '',
  contactPhone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
});

const pickerIndex = ref([0, 0, 0]);

const pickerRange = computed(() => {
  const [pIdx, cIdx] = pickerIndex.value;
  const province = REGION_DATA[pIdx] ?? REGION_DATA[0];
  const city = province.cities[cIdx] ?? province.cities[0];
  return [
    REGION_DATA.map((p) => p.name),
    province.cities.map((c) => c.name),
    city.districts,
  ];
});

const regionText = computed(() => {
  if (!regionSelected.value) return '';
  return [form.province, form.city, form.district].filter(Boolean).join(' ');
});

onLoad(async (query) => {
  const id = query?.id ? Number(query.id) : NaN;
  if (Number.isFinite(id) && id > 0) {
    editingId.value = id;
    uni.setNavigationBarTitle({ title: '编辑收货地址' });
    await loadForEdit(id);
  } else {
    uni.setNavigationBarTitle({ title: '新增收货地址' });
  }
});

async function loadForEdit(id: number) {
  const residentId = authStore.resident?.id;
  if (!residentId) return;
  try {
    const list = await fetchAddresses(residentId);
    const addr = list.find((item) => item.id === id);
    if (!addr) {
      uni.showToast({ title: '地址不存在', icon: 'none' });
      return;
    }
    form.contactName = addr.contactName;
    form.contactPhone = addr.contactPhone;
    form.province = addr.province;
    form.city = addr.city;
    form.district = addr.district;
    form.detail = addr.detail;
    form.isDefault = addr.isDefault;
    syncPickerFromForm();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加载失败';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

function syncPickerFromForm() {
  const pIdx = REGION_DATA.findIndex((p) => p.name === form.province);
  if (pIdx < 0) {
    regionSelected.value = !!(form.province || form.city || form.district);
    return;
  }
  const cIdx = REGION_DATA[pIdx].cities.findIndex((c) => c.name === form.city);
  const city = REGION_DATA[pIdx].cities[cIdx >= 0 ? cIdx : 0];
  const dIdx = city.districts.findIndex((d) => d === form.district);
  pickerIndex.value = [pIdx, cIdx >= 0 ? cIdx : 0, dIdx >= 0 ? dIdx : 0];
  regionSelected.value = true;
}

function applyRegionFromIndex(indexes: number[]) {
  const [pIdx, cIdx, dIdx] = indexes;
  const province = REGION_DATA[pIdx] ?? REGION_DATA[0];
  const city = province.cities[cIdx] ?? province.cities[0];
  const district = city.districts[dIdx] ?? city.districts[0];
  form.province = province.name;
  form.city = city.name;
  form.district = district;
  regionSelected.value = true;
}

function onColumnChange(e: { detail: { column: number; value: number } }) {
  const { column, value } = e.detail;
  const next = [...pickerIndex.value] as [number, number, number];
  next[column] = value;
  if (column === 0) {
    next[1] = 0;
    next[2] = 0;
  } else if (column === 1) {
    next[2] = 0;
  }
  pickerIndex.value = next;
}

function onRegionChange(e: { detail: { value: number[] } }) {
  const indexes = e.detail.value as [number, number, number];
  pickerIndex.value = indexes;
  applyRegionFromIndex(indexes);
}

async function onConfirm() {
  if (!form.contactName.trim()) {
    uni.showToast({ title: '请填写收货人', icon: 'none' });
    return;
  }
  if (!form.contactPhone.trim()) {
    uni.showToast({ title: '请填写手机号', icon: 'none' });
    return;
  }
  if (!regionSelected.value || !form.province || !form.city || !form.district) {
    uni.showToast({ title: '请选择所在地区', icon: 'none' });
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
        province: form.province,
        city: form.city,
        district: form.district,
        detail: form.detail.trim(),
        isDefault: form.isDefault,
      });
    } else {
      await createAddress({
        residentId,
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        province: form.province,
        city: form.city,
        district: form.district,
        detail: form.detail.trim(),
        isDefault: form.isDefault,
      });
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    saving.value = false;
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
  padding: 24rpx 24rpx 0;
  box-sizing: border-box;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
}

.card-default {
  padding: 28rpx;
}

.form-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-row-last {
  border-bottom: none;
}

.form-row-top {
  align-items: flex-start;
}

.form-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 30rpx;
  color: #333333;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
  text-align: left;
}

.form-value-wrap {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.form-value {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
}

.form-placeholder {
  flex: 1;
  font-size: 30rpx;
  color: #bbbbbb;
}

.placeholder {
  color: #bbbbbb;
}

.chevron {
  font-size: 36rpx;
  color: #cccccc;
  margin-left: 12rpx;
  line-height: 1;
}

.form-textarea {
  flex: 1;
  min-height: 120rpx;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.5;
  padding: 0;
}

.default-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.default-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  padding-right: 24rpx;
}

.default-title {
  font-size: 30rpx;
  color: #333333;
}

.default-tip {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.4;
}

.radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.radio-checked {
  border-color: #236EFF;
  background: #236EFF;
}

.radio-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ffffff;
}

.bottom-placeholder {
  height: 180rpx;
}

.footer {
	position: fixed;
	padding-top: 20rpx;
	padding-bottom: 60rpx;
	bottom: 0rpx;
	left: 0rpx;
	right: 0rpx;
	background: #FFF;
	padding-left: 48rpx;
	padding-right: 48rpx;
	/* 
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #f5f5f5; */
}

.btn-confirm {
  width: 100%;
  height: 88rpx;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
	border-radius: 20rpx;
	height: 88rpx;
	background: linear-gradient( 135deg, #246BFF 0%, #1AA1FF 100%);
}

.btn-confirm[disabled] {
  background: #b0c9f5;
}
</style>
