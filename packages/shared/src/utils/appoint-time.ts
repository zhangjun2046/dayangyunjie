import type { AppointTimeSlotBizType } from '../entities/appoint-time-slot';

export const DEFAULT_APPOINT_LEAD_MINUTES = 60;
export const MAX_APPOINT_LEAD_MINUTES = 1440;

export interface AppointTimeLeadDto {
  cleaningLeadMinutes: number;
  recyclingLeadMinutes: number;
}

export function isValidAppointLeadMinutes(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_APPOINT_LEAD_MINUTES;
}

/** 取时段起始 HH:mm；支持 `08:30` 与历史区间 `09:00-11:00`。 */
export function parseAppointTimeSlotStart(slot: string): string | null {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function toAppointDatePart(appointDate: string): string {
  return appointDate.trim().slice(0, 10);
}

/**
 * 预约开始时刻 <= 当前时刻 + 缓冲分钟 → 过近。
 * 日期按东八区拼完整时刻，避免 `YYYY-MM-DD` 被当成 UTC。
 */
export function isAppointTooSoon(
  appointDate: string,
  slot: string,
  leadMinutes: number,
  nowMs: number = Date.now(),
): boolean {
  const datePart = toAppointDatePart(appointDate);
  const hhmm = parseAppointTimeSlotStart(slot);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !hhmm) return true;
  const appointAt = Date.parse(`${datePart}T${hhmm}:00+08:00`);
  if (Number.isNaN(appointAt)) return true;
  return appointAt <= nowMs + leadMinutes * 60 * 1000;
}

export function isDateFullyTooSoon(
  dateStr: string,
  slots: readonly string[],
  leadMinutes: number,
  nowMs: number = Date.now(),
): boolean {
  if (slots.length === 0) return false;
  return slots.every((slot) => isAppointTooSoon(dateStr, slot, leadMinutes, nowMs));
}

export function formatAppointTooSoonMessage(leadMinutes: number): string {
  if (leadMinutes <= 0) return '预约时间已过，请选择更晚的时段';
  return `请至少提前 ${leadMinutes} 分钟预约`;
}

export function addChinaDays(dateStr: string, days: number): string {
  const start = Date.parse(`${toAppointDatePart(dateStr)}T00:00:00+08:00`);
  return formatChinaYmd(start + days * 24 * 60 * 60 * 1000);
}

export function formatChinaYmd(nowMs: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(nowMs);
}

/** 从今天起寻找第一个仍有可约格子的日期；找不到则返回今天。 */
export function pickFirstBookableDate(
  slots: readonly string[],
  leadMinutes: number,
  nowMs: number = Date.now(),
  maxLookaheadDays = 60,
): string {
  const today = formatChinaYmd(nowMs);
  if (slots.length === 0) return today;
  for (let i = 0; i <= maxLookaheadDays; i += 1) {
    const dateStr = addChinaDays(today, i);
    if (!isDateFullyTooSoon(dateStr, slots, leadMinutes, nowMs)) return dateStr;
  }
  return today;
}

export function leadMinutesForBiz(
  leads: AppointTimeLeadDto,
  bizType: AppointTimeSlotBizType,
): number {
  return bizType === 'CLEANING' ? leads.cleaningLeadMinutes : leads.recyclingLeadMinutes;
}
