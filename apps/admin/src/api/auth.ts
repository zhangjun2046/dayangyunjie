import request from './request';

export interface AdminLoginResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  admin: {
    id: number;
    email: string;
    name: string;
    username: string;
    isSuperAdmin: boolean;
  };
}

/** 管理员邮箱+密码登录 */
export function adminLogin(email: string, password: string) {
  return request.post<{ code: number; message: string; data: AdminLoginResult }>(
    '/auth/admin-login',
    { email, password },
  );
}
