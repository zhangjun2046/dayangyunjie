import {
  formatAppointTooSoonMessage,
  isAppointTooSoon,
  isDateFullyTooSoon,
  parseAppointTimeSlotStart,
  pickFirstBookableDate,
  pickFirstBookableTimeSlot,
} from '@dayangyunjie/shared';

const SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'] as const;
const DAY = '2026-09-17';
const at = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00+08:00`);

describe('appoint-time lead formula', () => {
  it('解析区间时段取起始', () => {
    expect(parseAppointTimeSlotStart('09:00-11:00')).toBe('09:00');
    expect(parseAppointTimeSlotStart('8:30')).toBe('08:30');
  });

  it.each([
    [0, '08:01', { '08:00': true, '08:30': false, '09:00': false, '09:30': false, '10:00': false, '10:30': false }],
    [60, '08:01', { '08:00': true, '08:30': true, '09:00': true, '09:30': false, '10:00': false, '10:30': false }],
    [120, '08:01', { '08:00': true, '08:30': true, '09:00': true, '09:30': true, '10:00': true, '10:30': false }],
    [0, '08:29', { '08:00': true, '08:30': false, '09:00': false, '09:30': false, '10:00': false, '10:30': false }],
    [60, '08:29', { '08:00': true, '08:30': true, '09:00': true, '09:30': false, '10:00': false, '10:30': false }],
    [120, '08:29', { '08:00': true, '08:30': true, '09:00': true, '09:30': true, '10:00': true, '10:30': false }],
  ] as const)(
    '缓冲 %s 现在 %s 的置灰结果',
    (lead, nowTime, expected) => {
      const nowMs = at(nowTime);
      for (const slot of SLOTS) {
        expect(isAppointTooSoon(DAY, slot, lead, nowMs)).toBe(
          (expected as Record<string, boolean>)[slot],
        );
      }
    },
  );

  it('边界相等也拒绝：11:00 对 10:05 + 60 分钟', () => {
    const nowMs = Date.parse('2026-09-17T10:05:00+08:00');
    expect(isAppointTooSoon(DAY, '11:00', 60, nowMs)).toBe(true);
    expect(isAppointTooSoon(DAY, '14:00', 60, nowMs)).toBe(false);
  });

  it('明天任意时段可通过', () => {
    const nowMs = at('08:01');
    expect(isAppointTooSoon('2026-09-18', '08:00', 120, nowMs)).toBe(false);
  });

  it('当天格子全过近时选出次日', () => {
    const nowMs = at('10:20');
    expect(isDateFullyTooSoon(DAY, SLOTS, 120, nowMs)).toBe(true);
    expect(pickFirstBookableDate(SLOTS, 120, nowMs)).toBe('2026-09-18');
  });

  it('失败文案随缓冲变化', () => {
    expect(formatAppointTooSoonMessage(0)).toBe('预约时间已过，请选择更晚的时段');
    expect(formatAppointTooSoonMessage(90)).toBe('请至少提前 90 分钟预约');
  });

  it('选出当天第一个未过近时段', () => {
    const nowMs = at('08:01');
    expect(pickFirstBookableTimeSlot(DAY, SLOTS, 60, nowMs)).toBe('09:30');
    expect(pickFirstBookableTimeSlot('', SLOTS, 60, nowMs)).toBe('');
  });
});
