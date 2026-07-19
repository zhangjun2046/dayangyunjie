import { defineStore } from 'pinia';

import { adminLogin } from '@/api/auth';
import { getAdminPermissions } from '@/api/admin-permission';
import { getToken, removeToken, setToken } from '@/utils/auth';

const ADMIN_ID_KEY = 'dayangyunjie_admin_id';
const ADMIN_NAME_KEY = 'dayangyunjie_admin_name';
const ADMIN_EMAIL_KEY = 'dayangyunjie_admin_email';
const ADMIN_USERNAME_KEY = 'dayangyunjie_admin_username';
const ADMIN_SUPER_KEY = 'dayangyunjie_admin_super';
const ADMIN_PERMISSIONS_KEY = 'dayangyunjie_admin_permissions';

function readStoredPermissions(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_PERMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() ?? '',
    adminId: Number(localStorage.getItem(ADMIN_ID_KEY) ?? 0),
    username: localStorage.getItem(ADMIN_NAME_KEY) ?? '',
    email: localStorage.getItem(ADMIN_EMAIL_KEY) ?? '',
    loginName: localStorage.getItem(ADMIN_USERNAME_KEY) ?? '',
    isSuperAdmin: localStorage.getItem(ADMIN_SUPER_KEY) === '1',
    /** P5.8b 功能授权：当前用户已授权的 menuKey 清单（超级管理员无需依赖本字段） */
    permissions: readStoredPermissions(),
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },
  actions: {
    /** 是否可访问某功能节点：超级管理员始终放行，否则按已授权清单判断 */
    hasMenu(menuKey: string): boolean {
      return this.isSuperAdmin || this.permissions.includes(menuKey);
    },
    /** 拉取当前用户的功能授权清单并持久化（登录成功后调用，失败不阻断登录流程） */
    async fetchPermissions(): Promise<void> {
      try {
        const res = await getAdminPermissions(this.adminId);
        this.permissions = res.data.data.menuKeys;
        localStorage.setItem(ADMIN_PERMISSIONS_KEY, JSON.stringify(this.permissions));
      } catch (err) {
        console.error('[admin] fetch permissions failed', err);
        this.permissions = [];
      }
    },
    /** 真实 Admin JWT 登录，对接 POST /auth/admin-login */
    async login(emailInput: string, password: string): Promise<void> {
      const res = await adminLogin(emailInput, password);
      const { tokens, admin } = res.data.data;
      this.token = tokens.accessToken;
      this.adminId = admin.id;
      this.username = admin.name;
      this.email = admin.email;
      this.loginName = admin.username;
      this.isSuperAdmin = admin.isSuperAdmin;
      setToken(tokens.accessToken);
      localStorage.setItem(ADMIN_ID_KEY, String(admin.id));
      localStorage.setItem(ADMIN_NAME_KEY, admin.name);
      localStorage.setItem(ADMIN_EMAIL_KEY, admin.email);
      localStorage.setItem(ADMIN_USERNAME_KEY, admin.username);
      localStorage.setItem(ADMIN_SUPER_KEY, admin.isSuperAdmin ? '1' : '0');
      console.info('[admin] login success', { adminId: admin.id, email: admin.email });
      await this.fetchPermissions();
    },
    logout() {
      this.token = '';
      this.adminId = 0;
      this.username = '';
      this.email = '';
      this.loginName = '';
      this.isSuperAdmin = false;
      this.permissions = [];
      removeToken();
      localStorage.removeItem(ADMIN_ID_KEY);
      localStorage.removeItem(ADMIN_NAME_KEY);
      localStorage.removeItem(ADMIN_EMAIL_KEY);
      localStorage.removeItem(ADMIN_USERNAME_KEY);
      localStorage.removeItem(ADMIN_SUPER_KEY);
      localStorage.removeItem(ADMIN_PERMISSIONS_KEY);
      console.info('[admin] user logged out');
    },
  },
});
