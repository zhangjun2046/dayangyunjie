import { defineStore } from 'pinia';

import { getToken, removeToken, setToken } from '@/utils/auth';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() ?? '',
    username: '',
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },
  actions: {
    /** 本地假登录（P2.1 替换为真实 Auth API） */
    mockLogin(username: string, password: string): boolean {
      if (!username.trim() || !password.trim()) {
        return false;
      }
      const mockToken = `mock-${Date.now()}`;
      this.token = mockToken;
      this.username = username.trim();
      setToken(mockToken);
      console.info('[admin] mock login success', { username: this.username });
      return true;
    },
    logout() {
      this.token = '';
      this.username = '';
      removeToken();
      console.info('[admin] user logged out');
    },
  },
});
