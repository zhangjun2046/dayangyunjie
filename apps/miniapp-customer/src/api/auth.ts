/**
 * 认证相关 API
 */

import { request } from './request';

export interface LoginResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  resident: {
    id: number;
    openid: string;
    nickname: string | null;
    avatar: string | null;
    phone?: string | null;
  };
}

/**
 * 将 getPhoneNumber 回调的 code 发给后端解密并绑定当前居民
 * 已配置微信凭证时走微信 getuserphonenumber；未配置时返回 mock 号
 * 需已登录（自动带 Authorization）
 */
export function decryptPhone(code: string): Promise<{ phone: string }> {
  return request<{ phone: string }>('POST', '/auth/decrypt-phone', { code });
}

/**
 * 微信登录：发送 wx.login code 换取 accessToken + resident
 * 已配置微信凭证时走 code2session（稳定 openid）；未配置时 mock
 */
export function wechatLogin(
  code: string,
  nickname?: string,
  avatar?: string,
): Promise<LoginResult> {
  console.info('[auth] wechatLogin called, code=', code);
  return request<LoginResult>('POST', '/auth/wechat-login', {
    code,
    ...(nickname ? { nickname } : {}),
    ...(avatar ? { avatar } : {}),
  });
}
