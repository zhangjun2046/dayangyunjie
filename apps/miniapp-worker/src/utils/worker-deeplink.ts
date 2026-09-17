/** 与服务号模板 miniprogram.pagepath 一致：`pages/task-detail/index?orderId=&orderType=` */

export const WORKER_TASK_DETAIL_PATH = 'pages/task-detail/index';
export const PENDING_WORKER_TASK_STORAGE_KEY = '__worker_pending_task__';

export type WorkerTaskOrderType = 'cleaning' | 'recycling';

export type WorkerTaskDeepLink = {
  orderId: number;
  orderType: WorkerTaskOrderType;
};

function normalizePath(path?: string): string {
  return (path ?? '').split('?')[0].replace(/^\//, '');
}

export function normalizeWorkerOrderType(raw: unknown): WorkerTaskOrderType | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (value === 'cleaning' || value === 'recycling') {
    return value;
  }
  return null;
}

export function parseWorkerTaskQuery(query?: Record<string, unknown> | null): WorkerTaskDeepLink | null {
  if (!query) {
    return null;
  }
  const orderId = Number(query.orderId);
  const orderType = normalizeWorkerOrderType(query.orderType);
  if (!Number.isInteger(orderId) || orderId <= 0 || !orderType) {
    return null;
  }
  return { orderId, orderType };
}

export function parseWorkerTaskDeepLink(
  path?: string,
  query?: Record<string, unknown> | null,
): WorkerTaskDeepLink | null {
  if (normalizePath(path) !== WORKER_TASK_DETAIL_PATH) {
    return null;
  }
  return parseWorkerTaskQuery(query);
}

export function parseWorkerTaskUrl(url: string): WorkerTaskDeepLink | null {
  const trimmed = url.trim();
  const qIndex = trimmed.indexOf('?');
  const path = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed;
  const search = qIndex >= 0 ? trimmed.slice(qIndex + 1) : '';
  const query: Record<string, string> = {};
  for (const part of search.split('&')) {
    if (!part) {
      continue;
    }
    const [key, ...rest] = part.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return parseWorkerTaskDeepLink(path, query);
}

/** 小程序内跳转（带前导 /）。服务号 pagepath 不要用这个。 */
export function workerTaskDetailUrl(link: WorkerTaskDeepLink): string {
  return `/${WORKER_TASK_DETAIL_PATH}?orderId=${link.orderId}&orderType=${link.orderType}`;
}

export function savePendingWorkerTask(link: WorkerTaskDeepLink): void {
  try {
    uni.setStorageSync(PENDING_WORKER_TASK_STORAGE_KEY, JSON.stringify(link));
  } catch {
    // 存储失败不挡打开详情
  }
}

export function peekPendingWorkerTask(): WorkerTaskDeepLink | null {
  try {
    const raw = uni.getStorageSync(PENDING_WORKER_TASK_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as WorkerTaskDeepLink) : (raw as WorkerTaskDeepLink);
    return parseWorkerTaskQuery(parsed);
  } catch {
    return null;
  }
}

export function consumePendingWorkerTask(): WorkerTaskDeepLink | null {
  const pending = peekPendingWorkerTask();
  try {
    uni.removeStorageSync(PENDING_WORKER_TASK_STORAGE_KEY);
  } catch {
    // ignore
  }
  return pending;
}

export function captureWorkerTaskDeepLink(options?: {
  path?: string;
  query?: Record<string, unknown>;
}): WorkerTaskDeepLink | null {
  const parsed = parseWorkerTaskDeepLink(options?.path, options?.query);
  if (!parsed) {
    return null;
  }
  if (!isAlreadyOnWorkerTask(parsed)) {
    savePendingWorkerTask(parsed);
  }
  return parsed;
}

export function isAlreadyOnWorkerTask(link: WorkerTaskDeepLink): boolean {
  try {
    const pages = getCurrentPages() as Array<{ route?: string; options?: Record<string, unknown> }>;
    const current = pages[pages.length - 1];
    if (normalizePath(current?.route) !== WORKER_TASK_DETAIL_PATH) {
      return false;
    }
    const currentLink = parseWorkerTaskQuery(current.options);
    return currentLink?.orderId === link.orderId && currentLink.orderType === link.orderType;
  } catch {
    return false;
  }
}

export function workerLoginUrl(): string {
  return '/pages/login/index';
}

/** 已登录且有待打开任务时跳转详情。本次启动本身就是详情页时不要再 navigateTo。 */
export function syncWorkerTaskDeepLinkIfAuthed(isLoggedIn: boolean, launchPath?: string): boolean {
  const pending = peekPendingWorkerTask();
  if (!pending) {
    return false;
  }
  const launchIsTarget = normalizePath(launchPath) === WORKER_TASK_DETAIL_PATH;
  if (launchIsTarget || isAlreadyOnWorkerTask(pending)) {
    if (isLoggedIn) {
      consumePendingWorkerTask();
    }
    return true;
  }
  if (!isLoggedIn) {
    return false;
  }
  openWorkerTaskDetail(pending, { consume: true, viaTaskTab: false });
  return true;
}

/** 登录成功后：先落到任务 tab 再打开详情，避免 tabBar 首页把深链吃掉。 */
export function resumeWorkerTaskAfterLogin(): boolean {
  const pending = peekPendingWorkerTask();
  if (!pending) {
    return false;
  }
  openWorkerTaskDetail(pending, { consume: true, viaTaskTab: true });
  return true;
}

function openWorkerTaskDetail(
  link: WorkerTaskDeepLink,
  options: { consume: boolean; viaTaskTab: boolean },
): void {
  const url = workerTaskDetailUrl(link);
  if (options.consume) {
    consumePendingWorkerTask();
  }
  const goDetail = () => {
    uni.navigateTo({
      url,
      fail: () => {
        uni.redirectTo({ url });
      },
    });
  };
  if (!options.viaTaskTab) {
    goDetail();
    return;
  }
  uni.switchTab({
    url: '/pages/tasks/index',
    success: goDetail,
    fail: () => {
      uni.reLaunch({ url });
    },
  });
}
