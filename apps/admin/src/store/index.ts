import { defineStore } from 'pinia';

import { adminLogin } from '@/api/auth';
import { getToken, removeToken, setToken } from '@/utils/auth';

const ADMIN_NAME_KEY = 'dayangyunjie_admin_name';
const ADMIN_EMAIL_KEY = 'dayangyunjie_admin_email';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() ?? '',
    username: localStorage.getItem(ADMIN_NAME_KEY) ?? '',
    email: localStorage.getItem(ADMIN_EMAIL_KEY) ?? '',
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },
  actions: {
    /** 真实 Admin JWT 登录，对接 POST /auth/admin-login */
    async login(emailInput: string, password: string): Promise<void> {
      const res = await adminLogin(emailInput, password);
      const { tokens, admin } = res.data.data;
      this.token = tokens.accessToken;
      this.username = admin.name;
      this.email = admin.email;
      setToken(tokens.accessToken);
      localStorage.setItem(ADMIN_NAME_KEY, admin.name);
      localStorage.setItem(ADMIN_EMAIL_KEY, admin.email);
      console.info('[admin] login success', { adminId: admin.id, email: admin.email });
    },
    logout() {
      this.token = '';
      this.username = '';
      this.email = '';
      removeToken();
      localStorage.removeItem(ADMIN_NAME_KEY);
      localStorage.removeItem(ADMIN_EMAIL_KEY);
      console.info('[admin] user logged out');
    },
  },
});
