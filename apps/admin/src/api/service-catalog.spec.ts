import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from './request';
import {
  createServiceCatalog,
  deleteServiceCatalog,
  fetchServiceCatalogs,
  toggleServiceCatalog,
  updateServiceCatalog,
} from './service-catalog';

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

describe('admin service-catalog API — icon flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('查询服务目录列表', () => {
    const params = {
      bizType: 'CLEANING' as const,
      name: '日常',
      page: 1,
      pageSize: 10,
    };
    fetchServiceCatalogs(params);
    expect(mockedRequest.get).toHaveBeenCalledWith('/service-catalogs', { params });
  });

  it('新增服务时携带上传后的 icon URL', () => {
    const body = {
      bizType: 'CLEANING' as const,
      name: '日常清扫',
      subtitle: '基础清洁',
      icon: 'https://cdn.example.com/uploads/ICON_1.webp',
      sortOrder: 1,
    };
    createServiceCatalog(body);
    expect(mockedRequest.post).toHaveBeenCalledWith('/service-catalogs', body);
  });

  it('大件分类新增时可携带价格海报 URL', () => {
    const body = {
      bizType: 'RECYCLING' as const,
      name: '大件类',
      priceImageUrl: 'https://cdn.example.com/uploads/POSTER_1.webp',
    };
    createServiceCatalog(body);
    expect(mockedRequest.post).toHaveBeenCalledWith('/service-catalogs', body);
  });

  it('编辑服务时可传 null 清除价格海报', () => {
    updateServiceCatalog(12, {
      name: '大件类',
      priceImageUrl: null,
    });
    expect(mockedRequest.put).toHaveBeenCalledWith('/service-catalogs/12', {
      name: '大件类',
      priceImageUrl: null,
    });
  });

  it('编辑服务时可传 null 清除 icon', () => {
    updateServiceCatalog(12, {
      name: '日常清扫',
      icon: null,
    });
    expect(mockedRequest.put).toHaveBeenCalledWith('/service-catalogs/12', {
      name: '日常清扫',
      icon: null,
    });
  });

  it('编辑服务时可更新 icon URL', () => {
    updateServiceCatalog(12, {
      icon: 'https://cdn.example.com/uploads/ICON_2.webp',
    });
    expect(mockedRequest.put).toHaveBeenCalledWith('/service-catalogs/12', {
      icon: 'https://cdn.example.com/uploads/ICON_2.webp',
    });
  });

  it('删除 / 切换启用状态', () => {
    deleteServiceCatalog(12);
    toggleServiceCatalog(12);
    expect(mockedRequest.delete).toHaveBeenCalledWith('/service-catalogs/12');
    expect(mockedRequest.patch).toHaveBeenCalledWith('/service-catalogs/12/toggle');
  });
});
