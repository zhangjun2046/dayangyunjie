/** 预约时段配置支持的业务类型（不含家政咨询） */
export type AppointTimeSlotBizType = 'CLEANING' | 'RECYCLING';

/** 预约时段格子 API 出参 */
export interface AppointTimeSlotConfigDto {
  id: number;
  bizType: AppointTimeSlotBizType;
  label: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 现网默认 8 个整点，供 seed 使用 */
export const DEFAULT_APPOINT_TIME_SLOT_LABELS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;

export const APPOINT_TIME_SLOT_LABEL_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const APPOINT_TIME_SLOT_FORMAT_MESSAGE = '时段格式须为 HH:mm，例如 08:00';

/** 校验单点 HH:mm（允许首尾空格，校验前 trim） */
export function isAppointTimeSlotLabel(value: string): boolean {
  return APPOINT_TIME_SLOT_LABEL_PATTERN.test(value.trim());
}
