/**
 * 员工认证相关 API
 */

import { request } from './request';

export interface WorkerTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface WorkerLoginResult {
  tokens: WorkerTokenPair;
  worker: {
    id: number;
    phone: string;
    name: string;
    employeeNo: string;
  };
}

/**
 * 员工手机号+密码登录
 * 调用 POST /auth/worker-login，返回 Worker JWT（role=worker）
 */
export function workerLogin(phone: string, password: string): Promise<WorkerLoginResult> {
  console.info('[worker-auth] workerLogin called, phone=', phone.slice(0, 3) + '****');
  return request<WorkerLoginResult>('POST', '/auth/worker-login', { phone, password });
}

/**
 * 使用 refreshToken 刷新访问令牌
 * POST /auth/refresh
 */
export function refreshWorkerTokens(refreshToken: string): Promise<{ tokens: WorkerTokenPair }> {
  console.info('[worker-auth] refreshWorkerTokens called');
  return request<{ tokens: WorkerTokenPair }>('POST', '/auth/refresh', { refreshToken });
}
