import { formatAppointTooSoonMessage, isAppointTooSoon } from '@/utils/appoint-time';

export function getAppointStep2GuardMessage(input: {
  selectedDate: string;
  selectedTime: string;
  leadMinutes: number;
  hasAddress: boolean;
}): string | null {
  if (!input.selectedDate) return '请选择预约日期';
  if (!input.selectedTime) return '请选择预约时段';
  if (isAppointTooSoon(input.selectedDate, input.selectedTime, input.leadMinutes)) {
    return formatAppointTooSoonMessage(input.leadMinutes);
  }
  if (!input.hasAddress) return '请选择服务地址';
  return null;
}

export function getBookingPrimaryAction(input: {
  step: number;
  confirmLabel: string;
  submitting: boolean;
  stepChanging: boolean;
}): { disabled: boolean; label: string } {
  const label = input.step >= 3 ? input.confirmLabel : '下一步';
  return {
    disabled: input.submitting || input.stepChanging,
    label,
  };
}
