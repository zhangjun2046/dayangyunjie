/** 微信登录（居民 / 员工小程序） */
export interface WxLoginDto {
  code: string;
}

/** 员工工号/手机号 + 密码登录 */
export interface WorkerPasswordLoginDto {
  account: string;
  password: string;
}

/** 管理后台邮箱登录 */
export interface AdminLoginDto {
  email: string;
  password: string;
}

/** 登录成功返回 */
export interface AuthTokenDto {
  accessToken: string;
  expiresIn: number;
}
