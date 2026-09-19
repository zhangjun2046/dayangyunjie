/**
 * 认证相关 API
 */

import { request } from './request';
import { needsSilentWechatUnionidBind } from '@/utils/silent-wechat-bind';

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
 * 手工填写手机号并写入当前居民（residents.phone）
 * 需已登录（自动带 Authorization）
 */
export function bindPhone(phone: string): Promise<{ phone: string }> {
  return request<{ phone: string }>('POST', '/auth/bind-phone', { phone });
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

export interface ResidentWechatBindStatus {
  bound: boolean;
  oaPaired: boolean;
  subscribed: boolean | null;
}

export function getResidentWechatBind(): Promise<ResidentWechatBindStatus> {
  return request<ResidentWechatBindStatus>('GET', '/auth/resident-wechat-bind');
}

export function bindResidentWechat(code: string): Promise<ResidentWechatBindStatus> {
  return request<ResidentWechatBindStatus>('POST', '/auth/resident-wechat-bind', { code });
}

function getWeixinLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success(res) {
        if (res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('未获取到微信登录码'));
      },
      fail() {
        reject(new Error('请在微信居民端小程序中打开'));
      },
    });
  });
}

let silentResidentBindInFlight: Promise<void> | null = null;

/**
 * 已登录后另取一次 wx.login code 补 unionid。
 * 不得复用 wechat-login 刚用过的 code。失败不挡业务。
 */
export function trySilentResidentWechatBind(): Promise<void> {
  if (silentResidentBindInFlight) {
    return silentResidentBindInFlight;
  }
  silentResidentBindInFlight = (async () => {
    try {
      const status = await getResidentWechatBind();
      if (!needsSilentWechatUnionidBind(status.bound)) {
        console.info('[auth] silent wechat bind skip, already bound');
        return;
      }
      const code = await getWeixinLoginCode();
      await bindResidentWechat(code);
      console.info('[auth] silent wechat bind ok');
    } catch (err) {
      console.info('[auth] silent wechat bind skipped', err);
    }
  })().finally(() => {
    silentResidentBindInFlight = null;
  });
  return silentResidentBindInFlight;
}
