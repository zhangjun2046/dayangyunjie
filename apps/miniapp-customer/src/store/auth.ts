/**
 * 认证状态管理 Store
 * - 持久化到 uni.storage（key: __auth__）
 * - 提供 wechatLogin、logout、setPhone、setPrivacyAgreed 等 action
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { wechatLogin as apiWechatLogin } from '@/api/auth';

const STORAGE_KEY = '__auth__';

interface ResidentInfo {
  id: number;
  openid: string;
  nickname: string | null;
  avatar: string | null;
}

interface PersistedState {
  accessToken: string | null;
  refreshToken: string | null;
  resident: ResidentInfo | null;
  hasPhone: boolean;
  hasAgreedPrivacy: boolean;
}

function loadFromStorage(): PersistedState {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PersistedState;
    }
  } catch {
    // 读取失败时使用默认值
  }
  return {
    accessToken: null,
    refreshToken: null,
    resident: null,
    hasPhone: false,
    hasAgreedPrivacy: false,
  };
}

export const useAuthStore = defineStore('auth', () => {
  const persisted = loadFromStorage();

  const accessToken = ref<string | null>(persisted.accessToken);
  const refreshToken = ref<string | null>(persisted.refreshToken);
  const resident = ref<ResidentInfo | null>(persisted.resident);
  const hasPhone = ref<boolean>(persisted.hasPhone);
  const hasAgreedPrivacy = ref<boolean>(persisted.hasAgreedPrivacy);

  const isLoggedIn = computed(() => !!accessToken.value && !!resident.value);

  function persist() {
    const state: PersistedState = {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      resident: resident.value,
      hasPhone: hasPhone.value,
      hasAgreedPrivacy: hasAgreedPrivacy.value,
    };
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(state));
  }

  /** 标记用户已同意隐私协议 */
  function setPrivacyAgreed() {
    hasAgreedPrivacy.value = true;
    persist();
    console.info('[auth-store] privacy agreed');
  }

  /**
   * 执行微信登录
   * @param code wx.login 返回的 code，H5 环境传入 mock code
   */
  async function wechatLogin(code: string): Promise<void> {
    console.info('[auth-store] wechatLogin start');
    const result = await apiWechatLogin(code);
    accessToken.value = result.tokens.accessToken;
    refreshToken.value = result.tokens.refreshToken;
    resident.value = result.resident;
    persist();
    console.info('[auth-store] wechatLogin success, residentId=', result.resident.id);
  }

  /**
   * 设置手机号补全完成标记
   * （P3.2 起可扩展为传 phone 到后端更新 resident 资料）
   */
  function setPhone(phone: string) {
    hasPhone.value = true;
    persist();
    console.info('[auth-store] phone set, phone=', phone.slice(0, 3) + '****');
  }

  /** 退出登录 */
  function logout() {
    accessToken.value = null;
    refreshToken.value = null;
    resident.value = null;
    hasPhone.value = false;
    uni.removeStorageSync(STORAGE_KEY);
    console.info('[auth-store] logout');
  }

  return {
    accessToken,
    refreshToken,
    resident,
    hasPhone,
    hasAgreedPrivacy,
    isLoggedIn,
    setPrivacyAgreed,
    wechatLogin,
    setPhone,
    logout,
  };
});
