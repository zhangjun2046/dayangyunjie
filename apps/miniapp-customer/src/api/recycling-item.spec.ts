import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecyclingItemDto } from '@dayangyunjie/shared';
import { request } from './request';
import { fetchEnabledRecyclingItems } from './recycling-item';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

const item: RecyclingItemDto = {
  id: 8,
  catalogId: 4,
  catalogName: '小件类废品',
  name: '纸张',
  priceText: '0.6元/kg',
  icon: null,
  sortOrder: 1,
  isEnabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('customer recycling-item API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按 catalogId 拉取启用中的回收品项', async () => {
    mockedRequest.mockResolvedValue([item]);
    await expect(fetchEnabledRecyclingItems(4)).resolves.toEqual([item]);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/recycling-items/enabled', { catalogId: 4 });
  });

  it('网络异常保持原错误抛出', async () => {
    const error = new Error('网络连接失败');
    mockedRequest.mockRejectedValue(error);
    await expect(fetchEnabledRecyclingItems(4)).rejects.toBe(error);
  });
});
