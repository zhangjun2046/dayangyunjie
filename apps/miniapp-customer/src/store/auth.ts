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
  /** 完整手机号（用户授权后持久化） */
  phone?: string | null;
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

/** 安全日志：小程序无 fetch，静默降级 */
function debugLog(payload: Record<string, unknown>) {
  try {
    fetch('http://127.0.0.1:7274/ingest/fee21d48-4d03-4852-be1e-1872cabcbb9a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1d02fc' },
      body: JSON.stringify({ sessionId: '1d02fc', timestamp: Date.now(), ...payload }),
    }).catch(() => {});
  } catch (_e) {
    // 小程序没有 fetch，静默忽略
  }
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
    // #region agent log
    debugLog({ location: 'auth.ts:wechatLogin-beforeAssign', message: 'before resident assign', hypothesisId: 'H-B', runId: 'run2', data: { phoneBeforeOverwrite: resident.value?.phone, residentIsNull: resident.value === null, resultHasPhone: !!(result.resident as Record<string, unknown>)?.phone } });
    // #endregion
    accessToken.value = result.tokens.accessToken;
    refreshToken.value = result.tokens.refreshToken;
    resident.value = result.resident;
    // #region agent log
    debugLog({ location: 'auth.ts:wechatLogin-afterAssign', message: 'after resident assign', hypothesisId: 'H-B', runId: 'run2', data: { residentPhoneAfter: resident.value?.phone, residentId: resident.value?.id } });
    // #endregion
    persist();
    console.info('[auth-store] wechatLogin success, residentId=', result.resident.id);
  }

  /**
   * 设置手机号：同时标记 hasPhone 并将号码持久化到 resident.phone
   */
  function setPhone(phone: string) {
    hasPhone.value = true;
    // #region agent log
    debugLog({ location: 'auth.ts:setPhone', message: 'setPhone called', hypothesisId: 'H-A', runId: 'run2', data: { phone: phone.slice(0, 3) + '****', residentIsNull: resident.value === null, residentId: resident.value?.id } });
    // #endregion
    if (resident.value) {
      resident.value = { ...resident.value, phone };
    }
    // #region agent log
    debugLog({ location: 'auth.ts:setPhone-after', message: 'setPhone after assign', hypothesisId: 'H-A', runId: 'run2', data: { phoneWritten: resident.value?.phone === phone, residentIsNull: resident.value === null } });
    // #endregion
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
