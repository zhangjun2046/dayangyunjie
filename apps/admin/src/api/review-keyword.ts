import type { ReviewKeywordBizType, ReviewKeywordDto } from '@dayangyunjie/shared';
import type { PagedResponse } from './cleaning';
import request, { type ApiResponse } from './request';

export interface QueryReviewKeywordParams {
  bizType?: ReviewKeywordBizType;
  keyword?: string;
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateReviewKeywordBody {
  bizType: ReviewKeywordBizType;
  keyword: string;
  sortOrder?: number;
}

export type UpdateReviewKeywordBody = Partial<CreateReviewKeywordBody>;

export const fetchReviewKeywords = (params?: QueryReviewKeywordParams) =>
  request.get<ApiResponse<PagedResponse<ReviewKeywordDto>>>('/review-keywords', { params });

export const createReviewKeyword = (body: CreateReviewKeywordBody) =>
  request.post<ApiResponse<ReviewKeywordDto>>('/review-keywords', body);

export const updateReviewKeyword = (id: number, body: UpdateReviewKeywordBody) =>
  request.put<ApiResponse<ReviewKeywordDto>>(`/review-keywords/${id}`, body);

export const deleteReviewKeyword = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/review-keywords/${id}`);

export const toggleReviewKeyword = (id: number) =>
  request.patch<ApiResponse<ReviewKeywordDto>>(`/review-keywords/${id}/toggle`);
