import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './request';
import { fetchWorkerServiceCatalogs, type ServiceCatalogDto } from './service-catalog';

vi.mock('./request', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

function makeCatalog(
  id: number,
  bizType: string,
  name: string,
  icon: string | null,
  isEnabled = true,
): ServiceCatalogDto {
  return { id, bizType, name, icon, isEnabled };
}

describe('worker service-catalog API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('请求全部服务目录以兼容停用的历史服务', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });

    await fetchWorkerServiceCatalogs();

    expect(mockedRequest).toHaveBeenCalledOnce();
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/service-catalogs', {
      page: 1,
      pageSize: 100,
    });
  });

  it('只保留保洁与废品回收目录，并保留停用项', async () => {
    const cleaning = makeCatalog(1, 'CLEANING', '专项保洁', '/cleaning.webp');
    const recycling = makeCatalog(2, 'RECYCLING', '超大件回收', '/recycling.webp', false);
    const consult = makeCatalog(3, 'CONSULT', '保姆', '/consult.webp');
    const unknown = makeCatalog(4, 'UNKNOWN', '未知业务', '/unknown.webp');
    mockedRequest.mockResolvedValue({
      items: [cleaning, recycling, consult, unknown],
      total: 4,
      page: 1,
      pageSize: 100,
    });

    await expect(fetchWorkerServiceCatalogs()).resolves.toEqual([cleaning, recycling]);
  });

  it('接口未返回 items 时使用空数组兜底', async () => {
    mockedRequest.mockResolvedValue({
      items: undefined,
      total: 0,
      page: 1,
      pageSize: 100,
    } as never);

    await expect(fetchWorkerServiceCatalogs()).resolves.toEqual([]);
  });

  it('请求失败时保持原错误抛出，由页面执行图标降级', async () => {
    const error = new Error('网络连接失败');
    mockedRequest.mockRejectedValue(error);

    await expect(fetchWorkerServiceCatalogs()).rejects.toBe(error);
  });
});
