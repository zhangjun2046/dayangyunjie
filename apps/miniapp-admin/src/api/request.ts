/**
 * uni.request 封装（管理端 H5）
 * - 自动注入 Authorization Bearer token
 * - 统一解包 { code, message, data }
 * - access 过期收到 401 时：用 refresh 换发一次并重试；仍失败再清会话回登录
 *
 * 注意：直接从 uni.storage 读写 token，避免与 store 形成硬循环依赖
 */

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

interface PersistedAuth {
  accessToken: string | null;
  refreshToken: string | null;
  admin: unknown;
  permissions: string[];
}

// #ifdef H5
const BASE_URL = (import.meta.env.VITE_API_BASE as string) || '/api/v1';
// #endif
// #ifndef H5
const BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:3000/api/v1';
// #endif

export const ADMIN_AUTH_STORAGE_KEY = '__admin_auth__';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 并发 401 共用一次 refresh，避免打爆 /auth/refresh */
let refreshInFlight: Promise<boolean> | null = null;

export function getTokenFromStorage(): string | null {
  return readPersistedAuth()?.accessToken ?? null;
}

function readPersistedAuth(): PersistedAuth | null {
  try {
    const raw = uni.getStorageSync(ADMIN_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as PersistedAuth) : (raw as PersistedAuth);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      admin: parsed.admin ?? null,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    };
  } catch {
    // ignore
  }
  return null;
}

function writePersistedAuth(state: PersistedAuth): void {
  uni.setStorageSync(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(state));
}

async function syncStoreFromStorage(): Promise<void> {
  try {
    const { useAuthStore } = await import('@/store/auth');
    useAuthStore().hydrateFromStorage();
  } catch {
    // store 未就绪时忽略，后续请求仍以 storage 为准
  }
}

async function clearSessionAndGoLogin(): Promise<void> {
  try {
    uni.removeStorageSync(ADMIN_AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    const { useAuthStore } = await import('@/store/auth');
    useAuthStore().logout();
  } catch {
    // ignore
  }
  uni.reLaunch({ url: '/pages/login/index' });
}

/** 用 refreshToken 换新 access；成功写回 storage 并同步 Pinia */
function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = new Promise<boolean>((resolve) => {
    const persisted = readPersistedAuth();
    const refreshToken = persisted?.refreshToken;
    if (!refreshToken) {
      resolve(false);
      return;
    }

    uni.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: 15000,
      success(res) {
        const status = res.statusCode ?? 0;
        const body = res.data as ApiResponse<{
          tokens?: { accessToken?: string; refreshToken?: string };
        }>;
        if (status !== 200 || !body || body.code !== 0 || !body.data?.tokens?.accessToken) {
          console.info('[admin-request] refresh failed', status, body?.message);
          resolve(false);
          return;
        }
        const next: PersistedAuth = {
          accessToken: body.data.tokens.accessToken,
          refreshToken: body.data.tokens.refreshToken ?? refreshToken,
          admin: persisted?.admin ?? null,
          permissions: persisted?.permissions ?? [],
        };
        writePersistedAuth(next);
        void syncStoreFromStorage();
        console.info('[admin-request] refresh success, retry pending request');
        resolve(true);
      },
      fail(err) {
        console.info('[admin-request] refresh network error', err);
        resolve(false);
      },
      complete() {
        refreshInFlight = null;
      },
    });
  });

  return refreshInFlight;
}

export async function request<T = unknown>(
  method: HttpMethod,
  path: string,
  data?: Record<string, unknown>,
): Promise<T> {
  return requestOnce<T>(method, path, data, false);
}

function requestOnce<T>(
  method: HttpMethod,
  path: string,
  data: Record<string, unknown> | undefined,
  isRetry: boolean,
): Promise<T> {
  const token = getTokenFromStorage();

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const isAuthBootstrap = path === '/auth/admin-login' || path === '/auth/refresh';
  if (token && !isAuthBootstrap) {
    header['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${BASE_URL}${path}`;

  let url = fullUrl;
  let body: Record<string, unknown> | undefined = data;
  if (method === 'GET' && data) {
    const qs = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url = `${fullUrl}?${qs}`;
    body = undefined;
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url,
      method,
      data: body,
      header,
      timeout: 15000,
      success(res) {
        const status = res.statusCode ?? 0;
        const resBody = res.data as ApiResponse<T>;

        if (status === 401 && !isAuthBootstrap) {
          void (async () => {
            if (!isRetry) {
              const refreshed = await tryRefreshAccessToken();
              if (refreshed) {
                try {
                  const data = await requestOnce<T>(method, path, data, true);
                  resolve(data);
                } catch (err) {
                  reject(err);
                }
                return;
              }
            }
            console.info(`[admin-request] 401: ${path} → refresh 失败，清会话回登录`);
            await clearSessionAndGoLogin();
            reject(new Error(resBody?.message || '登录已过期，请重新登录'));
          })();
          return;
        }

        if (!resBody || typeof resBody !== 'object' || resBody.code !== 0) {
          console.info(
            `[admin-request] API error: ${path} → code=${resBody?.code} msg=${resBody?.message}`,
          );
          reject(new Error(resBody?.message || '请求失败'));
          return;
        }
        resolve(resBody.data);
      },
      fail(err) {
        console.info(`[admin-request] Network error: ${path}`, err);
        reject(new Error('网络连接失败，请检查网络'));
      },
    });
  });
}
