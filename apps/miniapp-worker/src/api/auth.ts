/**
 * 员工认证相关 API
 */

import { request } from './request';
import { needsSilentWechatUnionidBind } from '@/utils/silent-wechat-bind';

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

export interface WorkerWechatBindStatus {
  bound: boolean;
  oaPaired: boolean;
  subscribed: boolean | null;
}

export function getWorkerWechatBind(): Promise<WorkerWechatBindStatus> {
  return request<WorkerWechatBindStatus>('GET', '/auth/worker-wechat-bind');
}

export function bindWorkerWechat(code: string): Promise<WorkerWechatBindStatus> {
  return request<WorkerWechatBindStatus>('POST', '/auth/worker-wechat-bind', { code });
}

/** 员工端小程序 wx.login code；H5 / 非微信环境会失败 */
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
        reject(new Error('请在微信员工端小程序中打开'));
      },
    });
  });
}

let silentWorkerBindInFlight: Promise<void> | null = null;

/** 登录后静默 wx.login → 员工绑定接口。失败不挡进首页，不走居民登录。 */
export function trySilentWorkerWechatBind(): Promise<void> {
  if (silentWorkerBindInFlight) {
    return silentWorkerBindInFlight;
  }
  silentWorkerBindInFlight = (async () => {
    try {
      const status = await getWorkerWechatBind();
      if (!needsSilentWechatUnionidBind(status.bound)) {
        console.info('[worker-auth] silent wechat bind skip, already bound');
        return;
      }
      const code = await getWeixinLoginCode();
      await bindWorkerWechat(code);
      console.info('[worker-auth] silent wechat bind ok');
    } catch (err) {
      console.info('[worker-auth] silent wechat bind skipped', err);
    }
  })().finally(() => {
    silentWorkerBindInFlight = null;
  });
  return silentWorkerBindInFlight;
}
