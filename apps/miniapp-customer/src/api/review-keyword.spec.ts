import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { fetchEnabledReviewKeywords } from './review-keyword';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('customer review-keyword API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['CLEANING', 'RECYCLING'] as const)('查询 %s 下全部启用关键词', async (bizType) => {
    const items = [{ id: 1, keyword: '准时到达' }];
    mockedRequest.mockResolvedValue({ items, total: 1, page: 1, pageSize: 100 });

    await expect(fetchEnabledReviewKeywords(bizType)).resolves.toEqual(items);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/review-keywords', {
      bizType,
      isEnabled: true,
      pageSize: 100,
    });
  });

  it('接口未返回 items 时使用空数组兜底', async () => {
    mockedRequest.mockResolvedValue({ items: undefined, total: 0, page: 1, pageSize: 100 } as never);
    await expect(fetchEnabledReviewKeywords('CLEANING')).resolves.toEqual([]);
  });

  it('网络异常保持原错误抛出', async () => {
    const error = new Error('网络连接失败');
    mockedRequest.mockRejectedValue(error);
    await expect(fetchEnabledReviewKeywords('CLEANING')).rejects.toBe(error);
  });
});
