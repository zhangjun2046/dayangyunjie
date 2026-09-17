import { createHash } from 'crypto';

export type AdminNotifyOrderType = 'cleaning' | 'recycling';

export function hashOaOauthToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function normalizeServerOrigin(serverBaseUrl?: string): string | null {
  const value = serverBaseUrl?.trim();
  if (!value || value === '待补充') {
    return null;
  }
  return value.replace(/\/+$/, '');
}

export function oauthCallbackRedirectUri(serverBaseUrl?: string): string | null {
  const origin = normalizeServerOrigin(serverBaseUrl);
  if (!origin) {
    return null;
  }
  return `${origin}/api/v1/wechat/oa/oauth/callback`;
}

export function buildWechatSnsAuthorizeUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  scope?: 'snsapi_base' | 'snsapi_userinfo';
}): string {
  const url = new URL('https://open.weixin.qq.com/connect/oauth2/authorize');
  url.searchParams.set('appid', input.appId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.scope ?? 'snsapi_base');
  url.searchParams.set('state', input.state);
  return `${url.toString()}#wechat_redirect`;
}

/** H5 基址须带尾斜杠，hash 为 `/pages/...`，结果不含第二个 path 段以免开放重定向。 */
export function buildAdminH5HashUrl(h5BaseUrl: string, hashPath: string): string | null {
  const base = h5BaseUrl.trim();
  if (!base || base === '待补充') {
    return null;
  }
  const withSlash = base.endsWith('/') ? base : `${base}/`;
  const trimmedHash = hashPath.trim().replace(/^#/, '');
  const normalized = trimmedHash.startsWith('/') ? trimmedHash : `/${trimmedHash}`;
  if (!normalized.startsWith('/pages/')) {
    return null;
  }
  return `${withSlash}#${normalized}`;
}

export function parseOaRedirectTarget(
  type?: string,
  id?: string | number,
): { type: AdminNotifyOrderType; id: number } | null {
  const normalizedType = String(type ?? '')
    .trim()
    .toLowerCase();
  if (normalizedType !== 'cleaning' && normalizedType !== 'recycling') {
    return null;
  }
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return null;
  }
  return { type: normalizedType, id: orderId };
}

export function buildAdminOrderDetailHash(target: { type: AdminNotifyOrderType; id: number }): string {
  return `/pages/order-detail/index?id=${target.id}&type=${target.type}`;
}

export function buildAdminOauthLandingHash(input: { status: 'ok' | 'error'; reason?: string }): string {
  const params = new URLSearchParams({ status: input.status });
  if (input.reason) {
    params.set('reason', input.reason);
  }
  return `/pages/wechat-bind/index?${params.toString()}`;
}
