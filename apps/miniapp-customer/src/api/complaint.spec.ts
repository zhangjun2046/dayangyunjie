import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { submitComplaint } from './complaint';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('customer complaint API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('提交数字 reasonConfigIds 数组而不是旧 reason code', async () => {
    mockedRequest.mockResolvedValue({ id: 1 });
    const params = {
      orderType: 'CLEANING' as const,
      orderId: 88,
      reasonConfigIds: [12, 15],
      description: '服务问题',
    };

    await submitComplaint(params);

    expect(mockedRequest).toHaveBeenCalledWith('POST', '/complaints', params);
    expect(mockedRequest.mock.calls[0]?.[2]).not.toHaveProperty('reason');
  });
});
