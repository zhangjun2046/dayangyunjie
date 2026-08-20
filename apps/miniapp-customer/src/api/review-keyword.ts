import type { ReviewKeywordBizType, ReviewKeywordDto } from '@dayangyunjie/shared';
import { request } from './request';

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 获取指定订单类型下已启用的评价关键词 */
export async function fetchEnabledReviewKeywords(
  bizType: ReviewKeywordBizType,
): Promise<ReviewKeywordDto[]> {
  const result = await request<PageResult<ReviewKeywordDto>>('GET', '/review-keywords', {
    bizType,
    isEnabled: true,
    pageSize: 100,
  });
  return result.items ?? [];
}
