import type { AppointTimeSlotBizType, AppointTimeSlotConfigDto } from '@dayangyunjie/shared';
import { DEFAULT_APPOINT_LEAD_MINUTES } from '@dayangyunjie/shared';
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
