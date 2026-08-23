/**
 * uni.request 封装
 * - 自动注入 Authorization Bearer token
 * - 统一解包 { code, message, data } 响应
 * - 非 0 code 抛出 Error，携带 message
 *
 * 注意：直接从 uni.storage 读取 token，避免与 store 形成循环依赖
 */

import { ApiRequestError } from './errors';
export { ApiRequestError } from './errors';

/** 后端统一响应结构 */
interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * H5 走 Vite 反向代理（/api/v1 → http://127.0.0.1:3000/api/v1）
 * 小程序运行时没有代理，必须使用绝对 URL
 * 生产环境将 VITE_API_BASE 替换为真实域名
 */
// #ifdef H5
const BASE_URL = '/api/v1';
// #endif
// #ifndef H5
const BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:3000/api/v1';
// #endif

/** 上传接口需要的绝对 base（H5 走 Vite 代理时返回空串，非 H5 使用绝对 URL） */
export const UPLOAD_BASE_URL: string = (() => {
  // 浏览器环境（H5）使用空串，uni.uploadFile 走 Vite 代理
  if (typeof window !== 'undefined') return '';
  // 小程序环境使用绝对 URL
  try {
    return (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
  } catch {
    return 'http://127.0.0.1:3000/api/v1';
  }
})();

const AUTH_STORAGE_KEY = '__auth__';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 从 storage 中直接读取 accessToken，不依赖 store */
export function getTokenFromStorage(): string | null {
  try {
    const raw = uni.getStorageSync(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { accessToken?: string | null };
      return parsed.accessToken ?? null;
    }
  } catch {
    // storage 读取失败时忽略
  }
  return null;
}

export async function request<T = unknown>(
  method: HttpMethod,
  path: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const token = getTokenFromStorage();

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${BASE_URL}${path}`;

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header,
      success(res) {
        const body = res.data as ApiResponse<T>;
        if (body.code !== 0) {
          console.info(`[request] API error: ${path} → code=${body.code} msg=${body.message}`);
          reject(
            new ApiRequestError(
              body.message || '请求失败',
              body.code,
              res.statusCode,
            ),
          );
          return;
        }
        resolve(body.data);
      },
      fail(err) {
        console.info(`[request] Network error: ${path}`, err);
        reject(new Error('网络连接失败，请检查网络'));
      },
    });
  });
}
