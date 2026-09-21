import { describe, expect, it } from 'vitest';
import {
  getAppointStep2GuardMessage,
  getBookingPrimaryAction,
} from './booking-primary-action';

describe('getAppointStep2GuardMessage', () => {
  const base = {
    selectedDate: '2099-01-01',
    selectedTime: '10:00',
    leadMinutes: 60,
    hasAddress: true,
  };

  it('按日期 → 时段 → 过近 → 地址 只报一条', () => {
    expect(getAppointStep2GuardMessage({ ...base, selectedDate: '' })).toBe(
      '请选择预约日期',
    );
    expect(getAppointStep2GuardMessage({ ...base, selectedTime: '' })).toBe(
      '请选择预约时段',
    );
    expect(
      getAppointStep2GuardMessage({
        ...base,
        selectedDate: '2020-01-01',
        selectedTime: '08:00',
      }),
    ).toMatch(/预约|提前/);
    expect(getAppointStep2GuardMessage({ ...base, hasAddress: false })).toBe(
      '请选择服务地址',
    );
    expect(getAppointStep2GuardMessage(base)).toBeNull();
  });
});

describe('getBookingPrimaryAction', () => {
  const ready = {
    confirmLabel: '确定预约',
    submitting: false,
    stepChanging: false,
  };

  it('文案固定，仅提交或翻页中置灰', () => {
    expect(getBookingPrimaryAction({ ...ready, step: 1 })).toEqual({
      disabled: false,
      label: '下一步',
    });
    expect(getBookingPrimaryAction({ ...ready, step: 2 })).toEqual({
      disabled: false,
      label: '下一步',
    });
    expect(
      getBookingPrimaryAction({ ...ready, step: 1, stepChanging: true }),
    ).toEqual({ disabled: true, label: '下一步' });
    expect(getBookingPrimaryAction({ ...ready, step: 3 })).toEqual({
      disabled: false,
      label: '确定预约',
    });
    expect(
      getBookingPrimaryAction({ ...ready, step: 3, submitting: true }),
    ).toEqual({ disabled: true, label: '确定预约' });
  });
});
