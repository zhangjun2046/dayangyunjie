export type NotifyOrderType = 'CLEANING' | 'RECYCLING';

export const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000;
export const ACCEPT_TIMEOUT_CONST2 = '服务人员接单超时';
export const T30_ELIGIBLE_STATUSES = ['PENDING_ASSIGN', 'ASSIGNED', 'ACCEPTED'] as const;

const CHINA_TIME_ZONE = 'Asia/Shanghai';

function dateParts(date: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: CHINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function appointParts(appointDate: Date, timeSlot: string) {
  const date = dateParts(appointDate);
  const match = timeSlot.trim().match(/^(\d{1,2}):(\d{2})/);
  return {
    ...date,
    hour: (match?.[1] ?? '0').padStart(2, '0'),
    minute: match?.[2] ?? '00',
    second: '00',
  };
}

function chinaDateFromParts(parts: {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}): Date {
  // 中国标准时间固定 UTC+8，不受 ECS/开发机本地时区影响。
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) - 8,
      Number(parts.minute),
    ),
  );
}

export function truncateThing(value: string, maxLength = 20): string {
  const chars = Array.from((value ?? '').trim());
  if (chars.length <= maxLength) {
    return chars.join('');
  }
  return `${chars.slice(0, Math.max(maxLength - 1, 0)).join('')}…`;
}

export function formatWechatServiceName(orderType: NotifyOrderType, catalogName: string): string {
  const prefix = orderType === 'CLEANING' ? '保洁服务' : '废品回收';
  return truncateThing(`${prefix}-${catalogName}`);
}

export function formatSmsServiceName(orderType: NotifyOrderType): string {
  return orderType === 'CLEANING' ? '保洁服务' : '废品回收';
}

export function formatAddressThing(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }
  const row = snapshot as Record<string, unknown>;
  const address = ['province', 'city', 'district', 'detail', 'buildingInfo']
    .map((key) => (typeof row[key] === 'string' ? row[key] : ''))
    .filter(Boolean)
    .join('');
  return truncateThing(address);
}

export function formatWechatTime(
  mode: 'dashMinute' | 'cnSecond' | 'cnMonthDayHao' | 'dashSecond',
  input: { appointDate?: Date; timeSlot?: string; at?: Date },
): string {
  const parts =
    input.at !== undefined
      ? dateParts(input.at)
      : appointParts(input.appointDate ?? new Date(), input.timeSlot ?? '00:00');
  if (mode === 'cnSecond') {
    return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}:${parts.second}`;
  }
  if (mode === 'cnMonthDayHao') {
    return `${parts.year}年${Number(parts.month)}月${Number(parts.day)}号 ${parts.hour}:${parts.minute}`;
  }
  if (mode === 'dashSecond') {
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function formatSmsAppointTime(appointDate: Date, timeSlot: string): string {
  const parts = appointParts(appointDate, timeSlot);
  return `${parts.year}年${parts.month}月${parts.day}日${parts.hour}:${parts.minute}`;
}

export function appointDateKey(appointDate: Date): string {
  const parts = dateParts(appointDate);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isT30ReminderDue(appointDate: Date, timeSlot: string, now: Date): boolean {
  const appointAt = chinaDateFromParts(appointParts(appointDate, timeSlot));
  const delta = appointAt.getTime() - now.getTime();
  return delta >= 29 * 60 * 1000 && delta <= 30 * 60 * 1000;
}

export function t30AppointDateBounds(now: Date): { gte: Date; lte: Date } {
  const target = new Date(now.getTime() + 30 * 60 * 1000);
  const parts = dateParts(target);
  const start = chinaDateFromParts({ ...parts, hour: '00', minute: '00' });
  return {
    gte: start,
    lte: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1),
  };
}

export function workerTaskPath(
  orderId: number,
  orderType: 'cleaning' | 'recycling',
): string {
  return `pages/task-detail/index?orderId=${orderId}&orderType=${orderType}`;
}

export function residentOrderDetailPath(
  orderId: number,
  orderType: 'cleaning' | 'recycling',
): string {
  return `pages/order-detail/index?id=${orderId}&type=${orderType}`;
}

export function residentReviewPath(orderId: number, orderType: NotifyOrderType): string {
  return `pages/review/index?orderId=${orderId}&orderType=${orderType}`;
}
