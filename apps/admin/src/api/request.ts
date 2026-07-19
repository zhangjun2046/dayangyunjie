import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

import { getToken, removeToken } from '@/utils/auth';

/** 统一 API 响应结构（与 NestJS 约定一致，P2 起生效） */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
});

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'code' in payload && payload.code !== 0) {
      ElMessage.error(payload.message || '请求失败');
      return Promise.reject(new Error(payload.message || '请求失败'));
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl: string = error.config?.url || '';
    // 登录接口本身返回 401（密码错误/账号已禁用）不是"会话过期"，应交回登录页展示具体错误，不能强制跳转覆盖表单
    const isLoginRequest = requestUrl.includes('/auth/') && requestUrl.includes('-login');

    if (status === 401 && !isLoginRequest) {
      removeToken();
      ElMessage.warning('登录已过期，请重新登录');
      window.location.href = '/login';
    } else if (!isLoginRequest) {
      const msg = error.response?.data?.message || error.message || '网络异常';
      ElMessage.error(msg);
    }
    return Promise.reject(error);
  },
);

export default request;
