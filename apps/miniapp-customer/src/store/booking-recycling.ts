/**
 * 废品回收预约三步向导状态管理
 * 在向导页面进入时调用 reset() 清空状态
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ServiceCatalogDto } from '@/api/service-catalog';
import type { AddressDto } from '@/api/address';
import type { BookingSelectedItem } from '@/pages/booking-recycling/booking-recycling.utils';

export const useBookingRecyclingStore = defineStore('bookingRecycling', () => {
  /** 当前步骤（1=选服务 2=选时间 3=确认订单） */
  const step = ref<1 | 2 | 3>(1);

  /** Step 1: 选择的废品回收类目 */
  const selectedCatalog = ref<ServiceCatalogDto | null>(null);

  /** Step 1: 预估重量（kg，整数，步长 5，最小 5） */
  const estimatedWeight = ref<number>(5);

  /** Step 2: 选择的日期 YYYY-MM-DD */
  const selectedDate = ref<string>('');

  /** Step 2: 选择的时段字符串，如 "09:00" */
  const selectedTime = ref<string>('');

  /** Step 2: 选择的服务地址 */
  const selectedAddress = ref<AddressDto | null>(null);

  /** Step 2: 已选回收品项快照（小件 quantity 恒为 1） */
  const selectedItems = ref<BookingSelectedItem[]>([]);

  /** Step 2: 是否有电梯；未选为 null */
  const hasElevator = ref<boolean | null>(null);

  /** Step 2: 搬运楼层，仅大件；未选为 null */
  const carryFloor = ref<number | null>(null);

  /** Step 2: 是否为代家人下单 */
  const isProxy = ref<boolean>(false);

  /** Step 3: 代下单 - 服务对象姓名 */
  const serviceContactName = ref<string>('');

  /** Step 3: 代下单 - 服务对象手机号 */
  const serviceContactPhone = ref<string>('');

  /** Step 3: 备注 */
  const remark = ref<string>('');

  function clearItemConditions() {
    selectedItems.value = [];
    hasElevator.value = null;
    carryFloor.value = null;
  }

  function selectCatalog(catalog: ServiceCatalogDto) {
    if (selectedCatalog.value?.id !== catalog.id) {
      clearItemConditions();
    }
    selectedCatalog.value = catalog;
  }

  /** 重置向导所有状态（进入预约页时调用） */
  function reset() {
    step.value = 1;
    selectedCatalog.value = null;
    estimatedWeight.value = 5;
    selectedDate.value = '';
    selectedTime.value = '';
    selectedAddress.value = null;
    isProxy.value = false;
    serviceContactName.value = '';
    serviceContactPhone.value = '';
    remark.value = '';
    clearItemConditions();
    console.info('[booking-recycling-store] reset');
  }

  function goStep(s: 1 | 2 | 3) {
    step.value = s;
    console.info('[booking-recycling-store] goStep', s);
  }

  return {
    step,
    selectedCatalog,
    estimatedWeight,
    selectedDate,
    selectedTime,
    selectedAddress,
    selectedItems,
    hasElevator,
    carryFloor,
    isProxy,
    serviceContactName,
    serviceContactPhone,
    remark,
    selectCatalog,
    reset,
    goStep,
  };
});
