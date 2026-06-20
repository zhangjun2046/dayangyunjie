/**
 * 保洁预约三步向导状态管理
 * 在向导页面进入时调用 reset() 清空状态
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ServiceCatalogDto } from '@/api/service-catalog';
import type { AddressDto } from '@/api/address';

export const useBookingCleaningStore = defineStore('bookingCleaning', () => {
  /** 当前步骤（1=选服务 2=选时间 3=确认订单） */
  const step = ref<1 | 2 | 3>(1);

  /** Step 1: 选择的服务目录 */
  const selectedCatalog = ref<ServiceCatalogDto | null>(null);

  /** Step 1: 服务时长（小时，整数） */
  const duration = ref<number>(2);

  /** Step 2: 选择的日期 YYYY-MM-DD */
  const selectedDate = ref<string>('');

  /** Step 2: 选择的时段字符串，如 "09:00" */
  const selectedTime = ref<string>('');

  /** Step 2: 选择的服务地址 */
  const selectedAddress = ref<AddressDto | null>(null);

  /** Step 2: 是否为代家人下单 */
  const isProxy = ref<boolean>(false);

  /** Step 3: 代下单 - 服务对象姓名 */
  const serviceContactName = ref<string>('');

  /** Step 3: 代下单 - 服务对象手机号 */
  const serviceContactPhone = ref<string>('');

  /** Step 3: 备注 */
  const remark = ref<string>('');

  /** 重置向导所有状态（进入预约页时调用） */
  function reset() {
    step.value = 1;
    selectedCatalog.value = null;
    duration.value = 2;
    selectedDate.value = '';
    selectedTime.value = '';
    selectedAddress.value = null;
    isProxy.value = false;
    serviceContactName.value = '';
    serviceContactPhone.value = '';
    remark.value = '';
    console.info('[booking-cleaning-store] reset');
  }

  function goStep(s: 1 | 2 | 3) {
    step.value = s;
    console.info('[booking-cleaning-store] goStep', s);
  }

  return {
    step,
    selectedCatalog,
    duration,
    selectedDate,
    selectedTime,
    selectedAddress,
    isProxy,
    serviceContactName,
    serviceContactPhone,
    remark,
    reset,
    goStep,
  };
});
