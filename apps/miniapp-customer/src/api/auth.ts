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
  };
}

/**
 * 将 getPhoneNumber 回调的 code 发给后端解密，返回手机号
 * 生产环境后端会调微信接口解密；mock 模式返回确定性伪手机号
 */
export function decryptPhone(code: string): Promise<{ phone: string }> {
  return request<{ phone: string }>('POST', '/auth/decrypt-phone', { code });
}

/**
 * 微信登录：发送 code 换取 accessToken + resident 信息
 * mock 模式下任意 code 均可使用
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
