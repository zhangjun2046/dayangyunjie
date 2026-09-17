import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { fetchAppointTimeLead, fetchEnabledAppointTimeSlots } from './appoint-time-slot';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('customer appoint-time-slot API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按业务类型读取已启用时段', async () => {
    const items = [{ id: 1, label: '08:00', bizType: 'CLEANING', sortOrder: 1, isEnabled: true }];
    mockedRequest.mockResolvedValue(items);

    await expect(fetchEnabledAppointTimeSlots('CLEANING')).resolves.toBe(items);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/appoint-time-slots', { bizType: 'CLEANING' });
  });

  it('读取业务缓冲分钟', async () => {
    mockedRequest.mockResolvedValue({ bizType: 'RECYCLING', leadMinutes: 90 });
    await expect(fetchAppointTimeLead('RECYCLING')).resolves.toEqual({
      bizType: 'RECYCLING',
      leadMinutes: 90,
    });
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/appoint-time-slots/lead', {
      bizType: 'RECYCLING',
    });
  });

  it('保持请求错误向上抛出', async () => {
    const error = new Error('网络连接失败');
    mockedRequest.mockRejectedValue(error);
    await expect(fetchEnabledAppointTimeSlots('RECYCLING')).rejects.toBe(error);
  });
});
