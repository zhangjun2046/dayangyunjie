import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { fetchServiceCatalog } from './service-catalog';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('customer service-catalog API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按 id 查询服务目录详情', async () => {
    mockedRequest.mockResolvedValue({
      id: 4,
      bizType: 'RECYCLING',
      name: '大件类',
      subtitle: '',
      icon: null,
      priceImageUrl: 'https://cdn.example.com/poster.webp',
      sortOrder: 1,
      isEnabled: true,
    });
    await expect(fetchServiceCatalog(4)).resolves.toMatchObject({
      id: 4,
      priceImageUrl: 'https://cdn.example.com/poster.webp',
    });
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/service-catalogs/4');
  });
});
