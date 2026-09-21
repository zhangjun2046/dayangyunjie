import type { AppointTimeSlotBizType, AppointTimeSlotConfigDto } from '@dayangyunjie/shared';
import {
  DEFAULT_APPOINT_LEAD_MINUTES,
  DEFAULT_APPOINT_TIME_SLOT_LABELS,
  isAppointTimeSlotLabel,
} from '@dayangyunjie/shared';
import { request } from './request';

/** 获取某业务已启用的预约时段格子 */
export function fetchEnabledAppointTimeSlots(
  bizType: AppointTimeSlotBizType,
): Promise<AppointTimeSlotConfigDto[]> {
  return request<AppointTimeSlotConfigDto[]>('GET', '/appoint-time-slots', { bizType });
}

export function fetchAppointTimeLead(
  bizType: AppointTimeSlotBizType,
): Promise<{ bizType: AppointTimeSlotBizType; leadMinutes: number }> {
  return request('GET', '/appoint-time-slots/lead', { bizType });
}

export function resolveLeadMinutes(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : DEFAULT_APPOINT_LEAD_MINUTES;
}

/** 接口无启用格子或失败时，回退到现网默认整点，避免预约第 2 步空白。 */
export function resolveEnabledTimeSlotLabels(
  rows: Array<{ label?: string }> | null | undefined,
): string[] {
  const fromApi = (rows ?? [])
    .map((row) => row.label?.trim() ?? '')
    .filter((label) => isAppointTimeSlotLabel(label));
  return fromApi.length > 0 ? fromApi : [...DEFAULT_APPOINT_TIME_SLOT_LABELS];
}
