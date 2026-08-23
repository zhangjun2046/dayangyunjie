import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from './request';
import {
  createReviewKeyword,
  deleteReviewKeyword,
  fetchReviewKeywords,
  toggleReviewKeyword,
  updateReviewKeyword,
} from './review-keyword';

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

describe('admin review-keyword API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按筛选参数查询评价关键词', () => {
    const params = {
      bizType: 'CLEANING' as const,
      keyword: '准时',
      isEnabled: true,
      page: 2,
      pageSize: 20,
    };
    fetchReviewKeywords(params);
    expect(mockedRequest.get).toHaveBeenCalledWith('/review-keywords', { params });
  });

  it('创建评价关键词', () => {
    const body = { bizType: 'RECYCLING' as const, keyword: '响应迅速', sortOrder: 2 };
    createReviewKeyword(body);
    expect(mockedRequest.post).toHaveBeenCalledWith('/review-keywords', body);
  });

  it('编辑评价关键词', () => {
    const body = { keyword: '服务专业', sortOrder: 3 };
    updateReviewKeyword(8, body);
    expect(mockedRequest.put).toHaveBeenCalledWith('/review-keywords/8', body);
  });

  it('删除评价关键词', () => {
    deleteReviewKeyword(8);
    expect(mockedRequest.delete).toHaveBeenCalledWith('/review-keywords/8');
  });

  it('切换评价关键词启用状态', () => {
    toggleReviewKeyword(8);
    expect(mockedRequest.patch).toHaveBeenCalledWith('/review-keywords/8/toggle');
  });
});
