import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from './request';
import {
  createAppointTimeSlot,
  deleteAppointTimeSlot,
  fetchAppointTimeLeads,
  fetchAppointTimeSlots,
  fetchEnabledAppointTimeSlots,
  toggleAppointTimeSlot,
  updateAppointTimeLeads,
  updateAppointTimeSlot,
} from './appoint-time-slot';

vi.mock('./request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedRequest = vi.mocked(request);

describe('admin appoint-time-slot API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('公开查询已启用时段', () => {
    fetchEnabledAppointTimeSlots('CLEANING');
    expect(mockedRequest.get).toHaveBeenCalledWith('/appoint-time-slots', {
      params: { bizType: 'CLEANING' },
    });
  });

  it('管理端分页查询', () => {
    const params = { bizType: 'RECYCLING' as const, page: 1, pageSize: 10 };
    fetchAppointTimeSlots(params);
    expect(mockedRequest.get).toHaveBeenCalledWith('/appoint-time-slots/admin', { params });
  });

  it('创建 / 更新 / 启停 / 删除', () => {
    createAppointTimeSlot({ bizType: 'CLEANING', label: '08:30', sortOrder: 1 });
    updateAppointTimeSlot(3, { label: '09:00' });
    toggleAppointTimeSlot(3);
    deleteAppointTimeSlot(3);
    expect(mockedRequest.post).toHaveBeenCalledWith('/appoint-time-slots', {
      bizType: 'CLEANING',
      label: '08:30',
      sortOrder: 1,
    });
    expect(mockedRequest.put).toHaveBeenCalledWith('/appoint-time-slots/3', { label: '09:00' });
    expect(mockedRequest.patch).toHaveBeenCalledWith('/appoint-time-slots/3/toggle');
    expect(mockedRequest.delete).toHaveBeenCalledWith('/appoint-time-slots/3');
  });

  it('读取并保存缓冲分钟', () => {
    fetchAppointTimeLeads();
    updateAppointTimeLeads({ cleaningLeadMinutes: 60, recyclingLeadMinutes: 90 });
    expect(mockedRequest.get).toHaveBeenCalledWith('/appoint-time-slots/leads');
    expect(mockedRequest.put).toHaveBeenCalledWith('/appoint-time-slots/leads', {
      cleaningLeadMinutes: 60,
      recyclingLeadMinutes: 90,
    });
  });
});
