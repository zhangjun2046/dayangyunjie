import { useOrderNavigationStore } from '@/store/order-navigation';

/** 与服务号模板 pagepath 一致（无前导 /，非 tabBar） */
export const RESIDENT_ORDER_DETAIL_PATH = 'pages/order-detail/index';
export const RESIDENT_REVIEW_PATH = 'pages/review/index';
export const PENDING_RESIDENT_LINK_STORAGE_KEY = '__resident_pending_deeplink__';

export type ResidentNotifyOrderType = 'cleaning' | 'recycling';
export type ResidentReviewOrderType = 'CLEANING' | 'RECYCLING';

export type ResidentDeepLink =
  | { kind: 'detail'; orderId: number; orderType: ResidentNotifyOrderType }
  | { kind: 'review'; orderId: number; orderType: ResidentReviewOrderType };

function normalizePath(path?: string): string {
  return (path ?? '').split('?')[0].replace(/^\//, '');
}

function parsePositiveId(raw: unknown): number | null {
  const orderId = Number(raw);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return null;
  }
  return orderId;
}

export function normalizeResidentDetailType(raw: unknown): ResidentNotifyOrderType | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (value === 'cleaning' || value === 'recycling') {
    return value;
  }
  return null;
}

export function normalizeResidentReviewType(raw: unknown): ResidentReviewOrderType | null {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (value === 'CLEANING' || value === 'RECYCLING') {
    return value;
  }
  return null;
}

export function parseResidentDetailQuery(
  query?: Record<string, unknown> | null,
): Extract<ResidentDeepLink, { kind: 'detail' }> | null {
  if (!query) {
    return null;
  }
  const orderId = parsePositiveId(query.id);
  const orderType = normalizeResidentDetailType(query.type);
  if (!orderId || !orderType) {
    return null;
  }
  return { kind: 'detail', orderId, orderType };
}

export function parseResidentReviewQuery(
  query?: Record<string, unknown> | null,
): Extract<ResidentDeepLink, { kind: 'review' }> | null {
  if (!query) {
    return null;
  }
  const orderId = parsePositiveId(query.orderId);
  const orderType = normalizeResidentReviewType(query.orderType);
  if (!orderId || !orderType) {
    return null;
  }
  return { kind: 'review', orderId, orderType };
}

export function parseResidentDeepLink(
  path?: string,
  query?: Record<string, unknown> | null,
): ResidentDeepLink | null {
  const normalized = normalizePath(path);
  if (normalized === RESIDENT_ORDER_DETAIL_PATH) {
    return parseResidentDetailQuery(query);
  }
  if (normalized === RESIDENT_REVIEW_PATH) {
    return parseResidentReviewQuery(query);
  }
  return null;
}

function parseQueryString(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  for (const part of search.split('&')) {
    if (!part) {
      continue;
    }
    const [key, ...rest] = part.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return query;
}

export function parseResidentDeepLinkUrl(url: string): ResidentDeepLink | null {
  const trimmed = url.trim();
  const qIndex = trimmed.indexOf('?');
  const path = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  const search = qIndex >= 0 ? trimmed.slice(qIndex + 1) : '';
  return parseResidentDeepLink(path, parseQueryString(search));
}

export function residentDeepLinkUrl(link: ResidentDeepLink): string {
  if (link.kind === 'detail') {
    return `/${RESIDENT_ORDER_DETAIL_PATH}?id=${link.orderId}&type=${link.orderType}`;
  }
  return `/${RESIDENT_REVIEW_PATH}?orderId=${link.orderId}&orderType=${link.orderType}`;
}

const RESIDENT_ORDERS_TAB = '/pages/orders/index';

/**
 * 评价提交成功后离开评价页：
 * 从订单详情进来则返回详情；服务号直达（无上一页）则打开该单详情。
 */
export function leaveAfterResidentReview(orderId: number, orderType: ResidentReviewOrderType): void {
  const detailType = normalizeResidentDetailType(orderType);
  uni.navigateBack({
    fail: () => {
      if (!detailType) {
        uni.switchTab({ url: RESIDENT_ORDERS_TAB });
        return;
      }
      uni.redirectTo({
        url: residentDeepLinkUrl({ kind: 'detail', orderId, orderType: detailType }),
        fail: () => {
          uni.switchTab({ url: RESIDENT_ORDERS_TAB });
        },
      });
    },
  });
}

export function savePendingResidentDeepLink(link: ResidentDeepLink): void {
  try {
    uni.setStorageSync(PENDING_RESIDENT_LINK_STORAGE_KEY, JSON.stringify(link));
  } catch {
    // 存储失败不挡打开
  }
}

export function peekPendingResidentDeepLink(): ResidentDeepLink | null {
  try {
    const raw = uni.getStorageSync(PENDING_RESIDENT_LINK_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as ResidentDeepLink) : (raw as ResidentDeepLink);
    if (parsed?.kind === 'detail') {
      return parseResidentDetailQuery({ id: parsed.orderId, type: parsed.orderType });
    }
    if (parsed?.kind === 'review') {
      return parseResidentReviewQuery({ orderId: parsed.orderId, orderType: parsed.orderType });
    }
    return null;
  } catch {
    return null;
  }
}

export function consumePendingResidentDeepLink(): ResidentDeepLink | null {
  const pending = peekPendingResidentDeepLink();
  try {
    uni.removeStorageSync(PENDING_RESIDENT_LINK_STORAGE_KEY);
  } catch {
    // ignore
  }
  return pending;
}

export function captureResidentDeepLink(options?: {
  path?: string;
  query?: Record<string, unknown>;
}): ResidentDeepLink | null {
  const parsed = parseResidentDeepLink(options?.path, options?.query);
  if (!parsed) {
    return null;
  }
  if (!isAlreadyOnResidentDeepLink(parsed)) {
    savePendingResidentDeepLink(parsed);
  }
  return parsed;
}

export function isAlreadyOnResidentDeepLink(link: ResidentDeepLink): boolean {
  try {
    const pages = getCurrentPages() as Array<{ route?: string; options?: Record<string, unknown> }>;
    const current = pages[pages.length - 1];
    const currentLink = parseResidentDeepLink(current?.route, current?.options);
    return sameResidentDeepLink(currentLink, link);
  } catch {
    return false;
  }
}

function sameResidentDeepLink(a: ResidentDeepLink | null, b: ResidentDeepLink): boolean {
  if (!a || a.kind !== b.kind || a.orderId !== b.orderId) {
    return false;
  }
  return a.orderType === b.orderType;
}

/** 已登录且本次启动就是目标页时不要再 navigateTo。 */
export function syncResidentDeepLinkIfAuthed(isLoggedIn: boolean, launchPath?: string): boolean {
  const pending = peekPendingResidentDeepLink();
  if (!pending) {
    return false;
  }
  const launchIsTarget =
    normalizePath(launchPath) === RESIDENT_ORDER_DETAIL_PATH ||
    normalizePath(launchPath) === RESIDENT_REVIEW_PATH;
  if (launchIsTarget || isAlreadyOnResidentDeepLink(pending)) {
    if (isLoggedIn) {
      consumePendingResidentDeepLink();
    }
    return true;
  }
  if (!isLoggedIn) {
    return false;
  }
  openResidentDeepLink(pending, { consume: true, viaOrderTab: false });
  return true;
}

/** 登录成功后先到订单 tab 再打开详情/评价。 */
export function resumeResidentDeepLinkAfterLogin(): boolean {
  const pending = peekPendingResidentDeepLink();
  if (!pending) {
    return false;
  }
  openResidentDeepLink(pending, { consume: true, viaOrderTab: true });
  return true;
}

function openResidentDeepLink(
  link: ResidentDeepLink,
  options: { consume: boolean; viaOrderTab: boolean },
): void {
  const url = residentDeepLinkUrl(link);
  if (options.consume) {
    consumePendingResidentDeepLink();
  }
  if (link.kind === 'detail') {
    try {
      useOrderNavigationStore().prepareOrderTab(link.orderType);
    } catch {
      // 无 Pinia 时仍跳转
    }
  }
  const goDetail = () => {
    uni.navigateTo({
      url,
      fail: () => {
        uni.redirectTo({ url });
      },
    });
  };
  if (!options.viaOrderTab) {
    goDetail();
    return;
  }
  uni.switchTab({
    url: '/pages/orders/index',
    success: goDetail,
    fail: () => {
      uni.reLaunch({ url });
    },
  });
}
