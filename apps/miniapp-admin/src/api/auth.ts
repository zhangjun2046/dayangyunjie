import { request } from './request';

export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminInfo {
  id: number;
  email: string;
  name: string;
  username: string;
  isSuperAdmin: boolean;
}

export interface AdminLoginResult {
  tokens: AdminTokenPair;
  admin: AdminInfo;
}

export function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  console.info('[admin-auth] adminLogin called, email=', email);
  return request<AdminLoginResult>('POST', '/auth/admin-login', { email, password });
}

export function refreshAdminTokens(refreshToken: string): Promise<{ tokens: AdminTokenPair }> {
  console.info('[admin-auth] refreshAdminTokens called');
  return request<{ tokens: AdminTokenPair }>('POST', '/auth/refresh', { refreshToken });
}
