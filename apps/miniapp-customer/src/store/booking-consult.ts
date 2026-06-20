/**
 * 家政咨询提交流程状态管理
 * 两步向导：Step 1=选择服务类型，Step 2=填写需求
 * 在向导页面进入时调用 reset() 清空状态
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ServiceCatalogDto } from '@/api/service-catalog';

export const useBookingConsultStore = defineStore('bookingConsult', () => {
  /** 当前步骤（1=选择服务类型 2=填写需求） */
  const step = ref<1 | 2>(1);

  /** Step 1: 选择的家政服务目录 */
  const selectedCatalog = ref<ServiceCatalogDto | null>(null);

  /** Step 2: 是否为代家人下单 */
  const isProxy = ref<boolean>(false);

  /** Step 2: 代下单 - 服务对象姓名 */
  const serviceContactName = ref<string>('');

  /** Step 2: 代下单 - 服务对象手机号 */
  const serviceContactPhone = ref<string>('');

  /** Step 2: 核心诉求（必填，最长 1000 字） */
  const requirementDesc = ref<string>('');

  /** Step 2: 联系人姓名（必填） */
  const contactName = ref<string>('');

  /** Step 2: 联系电话（必填） */
  const contactPhone = ref<string>('');

  /** Step 2: 备注（可选） */
  const remark = ref<string>('');

  /** 重置向导所有状态（进入预约页时调用） */
  function reset() {
    step.value = 1;
    selectedCatalog.value = null;
    isProxy.value = false;
    serviceContactName.value = '';
    serviceContactPhone.value = '';
    requirementDesc.value = '';
    contactName.value = '';
    contactPhone.value = '';
    remark.value = '';
    console.info('[booking-consult-store] reset');
  }

  function goStep(s: 1 | 2) {
    step.value = s;
    console.info('[booking-consult-store] goStep', s);
  }

  return {
    step,
    selectedCatalog,
    isProxy,
    serviceContactName,
    serviceContactPhone,
    requirementDesc,
    contactName,
    contactPhone,
    remark,
    reset,
    goStep,
  };
});
