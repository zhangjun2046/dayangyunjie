import {
  formatAppointTooSoonMessage,
  formatChinaYmd,
  isAppointTooSoon,
  isDateFullyTooSoon,
  pickFirstBookableDate,
  pickFirstBookableTimeSlot,
} from '@dayangyunjie/shared';

export {
  formatAppointTooSoonMessage,
  formatChinaYmd,
  isAppointTooSoon,
  isDateFullyTooSoon,
  pickFirstBookableDate,
  pickFirstBookableTimeSlot,
};

export function isSlotDisabled(
  dateStr: string,
  slot: string,
  leadMinutes: number,
): boolean {
  if (!dateStr) return false;
  return isAppointTooSoon(dateStr, slot, leadMinutes);
}
