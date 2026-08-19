/**
 * 员工认证状态管理 Store
 * - 持久化到 uni.storage（key: __worker_auth__）
 * - 提供 login、logout、ensureSession、isLoggedIn 等 action
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WorkerLoginResult } from '@/api/auth';
import { refreshWorkerTokens } from '@/api/auth';

export const STORAGE_KEY = '__worker_auth__';

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

const EMPTY_STATE: PersistedState = {
  accessToken: null,
  refreshToken: null,
  worker: null,
};

/** 兼容 string / 已解析 object 两种 storage 返回值（微信端偶发自动反序列化） */
function loadFromStorage(): PersistedState {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };

    let parsed: PersistedState;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw) as PersistedState;
    } else if (typeof raw === 'object') {
      parsed = raw as PersistedState;
    } else {
      return { ...EMPTY_STATE };
    }

    if (!parsed.accessToken || !parsed.worker?.id) {
      return { ...EMPTY_STATE };
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      worker: parsed.worker,
    };
  } catch {
    // 读取失败时使用默认值
  }
  return { ...EMPTY_STATE };
}

/** 解析 JWT payload（仅用于本地过期判断，不做签名校验） */
function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = globalThis.atob(padded);
    const json = decodeURIComponent(
      Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
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

  function hydrateFromStorage(): void {
    const fromDisk = loadFromStorage();
    accessToken.value = fromDisk.accessToken;
    refreshToken.value = fromDisk.refreshToken;
    worker.value = fromDisk.worker;
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

  /**
   * 启动时校验本地登录态：
   * - 无存储 / 残缺 → 未登录
   * - accessToken 未过期 → 有效
   * - access 过期但 refresh 可用 → 刷新后继续
   * - 均失效 → 清会话并返回 false
   */
  async function ensureSession(): Promise<boolean> {
    hydrateFromStorage();

    if (!accessToken.value || !worker.value) {
      console.info('[worker-auth-store] ensureSession: no local session');
      return false;
    }

    if (!isJwtExpired(accessToken.value)) {
      console.info('[worker-auth-store] ensureSession: access token still valid, workerId=', worker.value.id);
      return true;
    }

    if (!refreshToken.value || isJwtExpired(refreshToken.value, 0)) {
      console.info('[worker-auth-store] ensureSession: tokens expired, force logout');
      logout();
      return false;
    }

    try {
      console.info('[worker-auth-store] ensureSession: refreshing tokens…');
      const { tokens } = await refreshWorkerTokens(refreshToken.value);
      accessToken.value = tokens.accessToken;
      refreshToken.value = tokens.refreshToken;
      persist();
      console.info('[worker-auth-store] ensureSession: refresh success, workerId=', worker.value.id);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info('[worker-auth-store] ensureSession: refresh failed →', msg);
      logout();
      return false;
    }
  }

  return {
    accessToken,
    refreshToken,
    worker,
    isLoggedIn,
    login,
    logout,
    ensureSession,
    hydrateFromStorage,
  };
});
