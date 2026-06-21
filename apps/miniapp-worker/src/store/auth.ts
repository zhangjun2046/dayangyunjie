/**
 * 员工认证状态管理 Store
 * - 持久化到 uni.storage（key: __worker_auth__）
 * - 提供 login、logout、isLoggedIn 等 action
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WorkerLoginResult } from '@/api/auth';

const STORAGE_KEY = '__worker_auth__';

interface WorkerInfo {
  id: number;
  phone: string;
  name: string;
  employeeNo: string;
}

interface PersistedState {
  accessToken: string | null;
  refreshToken: string | null;
  worker: WorkerInfo | null;
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
    worker: null,
  };
}

export const useAuthStore = defineStore('worker-auth', () => {
  const persisted = loadFromStorage();

  const accessToken = ref<string | null>(persisted.accessToken);
  const refreshToken = ref<string | null>(persisted.refreshToken);
  const worker = ref<WorkerInfo | null>(persisted.worker);

  const isLoggedIn = computed(() => !!accessToken.value && !!worker.value);

  function persist() {
    const state: PersistedState = {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      worker: worker.value,
    };
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * 员工登录：将 API 返回结果写入 store 并持久化
   */
  function login(result: WorkerLoginResult): void {
    accessToken.value = result.tokens.accessToken;
    refreshToken.value = result.tokens.refreshToken;
    worker.value = result.worker;
    persist();
    console.info('[worker-auth-store] login success, workerId=', result.worker.id);
  }

  /** 退出登录，清除所有状态 */
  function logout(): void {
    accessToken.value = null;
    refreshToken.value = null;
    worker.value = null;
    uni.removeStorageSync(STORAGE_KEY);
    console.info('[worker-auth-store] logout');
  }

  return {
    accessToken,
    refreshToken,
    worker,
    isLoggedIn,
    login,
    logout,
  };
});
