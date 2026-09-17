/** 与服务号中转 302 后的 H5 hash 一致：`#/pages/order-detail/index?id=&type=` */

export const ADMIN_ORDER_DETAIL_PATH = 'pages/order-detail/index';
export const PENDING_ADMIN_ORDER_STORAGE_KEY = '__admin_pending_order__';

export type AdminNotifyOrderType = 'cleaning' | 'recycling';

export type AdminOrderDeepLink = {
  orderId: number;
  orderType: AdminNotifyOrderType;
};

function normalizePath(path?: string): string {
  return (path ?? '').split('?')[0].replace(/^\//, '');
}

export function normalizeAdminOrderType(raw: unknown): AdminNotifyOrderType | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (value === 'cleaning' || value === 'recycling') {
    return value;
  }
  return null;
}

export function parseAdminOrderQuery(query?: Record<string, unknown> | null): AdminOrderDeepLink | null {
  if (!query) {
    return null;
  }
  const orderId = Number(query.id ?? query.orderId);
  const orderType = normalizeAdminOrderType(query.type ?? query.orderType);
  if (!Number.isInteger(orderId) || orderId <= 0 || !orderType) {
    return null;
  }
  return { orderId, orderType };
}

export function parseAdminOrderDeepLink(
  path?: string,
  query?: Record<string, unknown> | null,
): AdminOrderDeepLink | null {
  if (normalizePath(path) !== ADMIN_ORDER_DETAIL_PATH) {
    return null;
  }
  return parseAdminOrderQuery(query);
}

export function parseAdminOrderUrl(url: string): AdminOrderDeepLink | null {
  const trimmed = url.trim();
  const hashIndex = trimmed.indexOf('#');
  const fromHash = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed;
  const pathAndQuery = fromHash.replace(/^\//, '');
  const qIndex = pathAndQuery.indexOf('?');
  const path = qIndex >= 0 ? pathAndQuery.slice(0, qIndex) : pathAndQuery;
  const search = qIndex >= 0 ? pathAndQuery.slice(qIndex + 1) : '';
  const query: Record<string, string> = {};
  for (const part of search.split('&')) {
    if (!part) {
      continue;
    }
    const [key, ...rest] = part.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return parseAdminOrderDeepLink(path, query);
}

export function adminOrderDetailUrl(link: AdminOrderDeepLink): string {
  return `/${ADMIN_ORDER_DETAIL_PATH}?id=${link.orderId}&type=${link.orderType}`;
}

function hasAdminSession(): boolean {
  try {
    return Boolean(uni.getStorageSync('__admin_auth__'));
  } catch {
    return false;
  }
}

export function savePendingAdminOrder(link: AdminOrderDeepLink): void {
  try {
    uni.setStorageSync(PENDING_ADMIN_ORDER_STORAGE_KEY, JSON.stringify(link));
  } catch {
    // 存储失败不挡打开详情
  }
}

export function peekPendingAdminOrder(): AdminOrderDeepLink | null {
  try {
    const raw = uni.getStorageSync(PENDING_ADMIN_ORDER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as AdminOrderDeepLink) : (raw as AdminOrderDeepLink);
    return parseAdminOrderQuery(parsed);
  } catch {
    return null;
  }
}

export function consumePendingAdminOrder(): AdminOrderDeepLink | null {
  const pending = peekPendingAdminOrder();
  try {
    uni.removeStorageSync(PENDING_ADMIN_ORDER_STORAGE_KEY);
  } catch {
    // ignore
  }
  return pending;
}

export function captureAdminOrderDeepLink(options?: {
  path?: string;
  query?: Record<string, unknown>;
}): AdminOrderDeepLink | null {
  const parsed = parseAdminOrderDeepLink(options?.path, options?.query);
  if (parsed && !hasAdminSession()) {
    savePendingAdminOrder(parsed);
  }
  return parsed;
}

export function captureAdminOrderDeepLinkFromUrl(url: string): AdminOrderDeepLink | null {
  const parsed = parseAdminOrderUrl(url);
  if (parsed && !hasAdminSession()) {
    savePendingAdminOrder(parsed);
  }
  return parsed;
}

export function captureAdminOrderDeepLinkFromCurrentPage(): AdminOrderDeepLink | null {
  try {
    const pages = getCurrentPages() as Array<{ route?: string; options?: Record<string, unknown> }>;
    const current = pages[pages.length - 1];
    const parsed = parseAdminOrderDeepLink(current?.route, current?.options);
    if (parsed) {
      savePendingAdminOrder(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resumeAdminOrderAfterLogin(): boolean {
  const pending = peekPendingAdminOrder();
  if (!pending) {
    return false;
  }
  const url = adminOrderDetailUrl(pending);
  consumePendingAdminOrder();
  uni.reLaunch({
    url: '/pages/orders/index',
    success: () => {
      uni.navigateTo({
        url,
        fail: () => {
          uni.redirectTo({ url });
        },
      });
    },
    fail: () => {
      uni.reLaunch({ url });
    },
  });
  return true;
}
