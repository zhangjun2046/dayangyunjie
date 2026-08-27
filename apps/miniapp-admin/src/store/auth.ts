/**
 * 管理端认证状态
 * - 持久化到 uni.storage（key: __admin_auth__）
 * - 登录成功后拉一次功能授权；列表 onShow / 下拉 / 切 Tab 时 refreshPermissions
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AdminInfo, AdminLoginResult } from '@/api/auth';
import { refreshAdminTokens } from '@/api/auth';
import { getAdminPermissions } from '@/api/permission';
import { readJwtExpiry } from '@/utils/jwt';

export const STORAGE_KEY = '__admin_auth__';

interface PersistedState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: AdminInfo | null;
  permissions: string[];
}

const EMPTY_STATE: PersistedState = {
  accessToken: null,
  refreshToken: null,
  admin: null,
  permissions: [],
};

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

    if (!parsed.accessToken || !parsed.admin?.id) {
      return { ...EMPTY_STATE };
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? null,
      admin: parsed.admin,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    };
  } catch {
    // 读取失败时使用默认值
  }
  return { ...EMPTY_STATE };
}

export const useAuthStore = defineStore('admin-auth', () => {
  const persisted = loadFromStorage();

  const accessToken = ref<string | null>(persisted.accessToken);
  const refreshToken = ref<string | null>(persisted.refreshToken);
  const admin = ref<AdminInfo | null>(persisted.admin);
  const permissions = ref<string[]>(persisted.permissions);

  const isLoggedIn = computed(() => !!accessToken.value && !!admin.value);
  const isSuperAdmin = computed(() => !!admin.value?.isSuperAdmin);

  function persist() {
    const state: PersistedState = {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      admin: admin.value,
      permissions: permissions.value,
    };
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(state));
  }

  function hydrateFromStorage(): void {
    const fromDisk = loadFromStorage();
    accessToken.value = fromDisk.accessToken;
    refreshToken.value = fromDisk.refreshToken;
    admin.value = fromDisk.admin;
    permissions.value = fromDisk.permissions;
  }

  function hasMenu(menuKey: string): boolean {
    return isSuperAdmin.value || permissions.value.includes(menuKey);
  }

  function login(result: AdminLoginResult): void {
    accessToken.value = result.tokens.accessToken;
    refreshToken.value = result.tokens.refreshToken;
    admin.value = result.admin;
    persist();
    console.info('[admin-auth-store] login success, adminId=', result.admin.id);
  }

  function logout(): void {
    accessToken.value = null;
    refreshToken.value = null;
    admin.value = null;
    permissions.value = [];
    uni.removeStorageSync(STORAGE_KEY);
    console.info('[admin-auth-store] logout');
  }

  /** 登录成功后拉一次；失败不阻断登录 */
  async function fetchPermissions(): Promise<void> {
    const adminId = admin.value?.id;
    if (!adminId) return;
    try {
      const res = await getAdminPermissions(adminId);
      permissions.value = res.menuKeys ?? [];
      persist();
      console.info('[admin-auth-store] permissions loaded', permissions.value.length);
    } catch (err) {
      console.info('[admin-auth-store] fetch permissions failed', err);
      permissions.value = [];
    }
  }

  /**
   * 会话中重拉权限。成功则写回 storage（含 isSuperAdmin）并返回 true；
   * 失败保留本地旧清单并返回 false（不要把已画出的 Tab 抹掉）。
   */
  async function refreshPermissions(): Promise<boolean> {
    const adminId = admin.value?.id;
    if (!adminId) return false;
    try {
      const res = await getAdminPermissions(adminId);
      permissions.value = res.menuKeys ?? [];
      if (admin.value) {
        admin.value = { ...admin.value, isSuperAdmin: res.isSuperAdmin };
      }
      persist();
      console.info('[admin-auth-store] permissions refreshed', permissions.value.length);
      return true;
    } catch (err) {
      console.info('[admin-auth-store] refreshPermissions failed, keep old', err);
      return false;
    }
  }

  async function ensureSession(): Promise<boolean> {
    hydrateFromStorage();

    if (!accessToken.value || !admin.value) {
      console.info('[admin-auth-store] ensureSession: no local session');
      return false;
    }

    const accessExpiry = readJwtExpiry(accessToken.value);
    console.info(
      '[admin-auth-store] ensureSession: accessExpiry=',
      accessExpiry,
      'adminId=',
      admin.value.id,
    );
    if (accessExpiry === 'valid') {
      return true;
    }
    if (accessExpiry === 'unknown') {
      return true;
    }

    const refreshExpiry = refreshToken.value ? readJwtExpiry(refreshToken.value, 0) : 'expired';
    if (!refreshToken.value || refreshExpiry === 'expired') {
      logout();
      return false;
    }

    try {
      const { tokens } = await refreshAdminTokens(refreshToken.value);
      accessToken.value = tokens.accessToken;
      refreshToken.value = tokens.refreshToken;
      persist();
      console.info('[admin-auth-store] ensureSession: refresh success, adminId=', admin.value.id);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.info('[admin-auth-store] ensureSession: refresh failed →', msg);
      logout();
      return false;
    }
  }

  return {
    accessToken,
    refreshToken,
    admin,
    permissions,
    isLoggedIn,
    isSuperAdmin,
    hasMenu,
    login,
    logout,
    fetchPermissions,
    refreshPermissions,
    ensureSession,
    hydrateFromStorage,
  };
});
