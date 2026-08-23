import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { fetchEnabledComplaintReasonConfigs } from './complaint-reason-config';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('customer complaint-reason-config API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('调用公开接口读取已启用配置', async () => {
    const items = [{ id: 12, label: '其他原因', sortOrder: 10, isEnabled: true }];
    mockedRequest.mockResolvedValue(items);

    await expect(fetchEnabledComplaintReasonConfigs()).resolves.toBe(items);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/complaint-reason-configs');
  });

  it('正常返回空配置数组', async () => {
    mockedRequest.mockResolvedValue([]);

    await expect(fetchEnabledComplaintReasonConfigs()).resolves.toEqual([]);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/complaint-reason-configs');
  });

  it('保持请求错误向上抛出', async () => {
    const error = new Error('网络连接失败');
    mockedRequest.mockRejectedValue(error);
    await expect(fetchEnabledComplaintReasonConfigs()).rejects.toBe(error);
  });
});
