/**
 * uni.request 封装（员工端）
 * - 自动注入 Authorization Bearer token
 * - 统一解包 { code, message, data } 响应
 * - 非 0 code 抛出 Error，携带 message
 *
 * 注意：直接从 uni.storage 读取 token，避免与 store 形成循环依赖
 */

/** 后端统一响应结构 */
interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * H5 走 Vite 反向代理（/api/v1 → http://127.0.0.1:3000/api/v1）
 * 小程序运行时没有代理，必须使用绝对 URL
 */
// #ifdef H5
const BASE_URL = '/api/v1';
// #endif
// #ifndef H5
const BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:3000/api/v1';
// #endif

/**
 * 文件上传 Base URL（uni.uploadFile 不走 Vite 代理，需使用与 BASE_URL 相同的前缀）
 * H5 环境：'/api/v1'，让 Vite proxy（/api/v1 → localhost:3000）处理
 * 小程序环境：直连后端绝对地址
 */
// #ifdef H5
export const UPLOAD_BASE_URL = '/api/v1';
// #endif
// #ifndef H5
export const UPLOAD_BASE_URL: string =
  (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:3000/api/v1';
// #endif

const WORKER_AUTH_STORAGE_KEY = '__worker_auth__';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 从 storage 中直接读取 worker accessToken，不依赖 store */
export function getTokenFromStorage(): string | null {
  try {
    const raw = uni.getStorageSync(WORKER_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as { accessToken?: string | null })
        : (raw as { accessToken?: string | null });
    return parsed.accessToken ?? null;
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
  // 登录/刷新接口不携带旧 Token，避免过期 access 干扰
  const isAuthBootstrap = path === '/auth/worker-login' || path === '/auth/refresh';
  if (token && !isAuthBootstrap) {
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
          console.info(`[worker-request] API error: ${path} → code=${body.code} msg=${body.message}`);
          reject(new Error(body.message || '请求失败'));
          return;
        }
        resolve(body.data);
      },
      fail(err) {
        console.info(`[worker-request] Network error: ${path}`, err);
        reject(new Error('网络连接失败，请检查网络'));
      },
    });
  });
}
