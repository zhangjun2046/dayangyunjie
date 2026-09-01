import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from './request';
import {
  createRecyclingItem,
  deleteRecyclingItem,
  fetchRecyclingItems,
  toggleRecyclingItem,
  updateRecyclingItem,
} from './recycling-item';

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

describe('admin recycling-item API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按分类和名称筛选查询回收品项', () => {
    const params = {
      catalogId: 4,
      name: '纸',
      page: 1,
      pageSize: 10,
    };
    fetchRecyclingItems(params);
    expect(mockedRequest.get).toHaveBeenCalledWith('/recycling-items', { params });
  });

  it('新增品项只提交 catalogId、name、priceText、icon、sortOrder', () => {
    const body = {
      catalogId: 4,
      name: '纸张',
      priceText: '0.6元/kg',
      icon: 'https://cdn.example.com/paper.webp',
      sortOrder: 1,
    };
    createRecyclingItem(body);
    expect(mockedRequest.post).toHaveBeenCalledWith('/recycling-items', body);
  });

  it('编辑品项时可传 null 清除 icon', () => {
    updateRecyclingItem(12, {
      catalogId: 4,
      name: '纸张',
      priceText: '0.6元/kg',
      icon: null,
      sortOrder: 1,
    });
    expect(mockedRequest.put).toHaveBeenCalledWith('/recycling-items/12', {
      catalogId: 4,
      name: '纸张',
      priceText: '0.6元/kg',
      icon: null,
      sortOrder: 1,
    });
  });

  it('删除 / 切换启用状态', () => {
    deleteRecyclingItem(12);
    toggleRecyclingItem(12);
    expect(mockedRequest.delete).toHaveBeenCalledWith('/recycling-items/12');
    expect(mockedRequest.patch).toHaveBeenCalledWith('/recycling-items/12/toggle');
  });
});
