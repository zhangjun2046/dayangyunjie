/**
 * 评价 API
 * POST /reviews — 提交服务评价，驱动 PENDING_REVIEW → REVIEWED
 */

import { request } from './request';

export interface SubmitReviewParams {
  /** 订单 ID */
  orderId: number;
  /** 订单类型：CLEANING | RECYCLING */
  orderType: 'CLEANING' | 'RECYCLING';
  /** 居民 ID */
  residentId: number;
  /** 星级 1–5 */
  rating: number;
  /** 快捷标签，如 ['准时', '专业'] */
  tags?: string[];
  /** 文字评语 */
  content?: string;
  /** 评价图片 URL 列表 */
  photoUrls?: string[];
}

export interface ReviewDto {
  id: number;
  orderId: number;
  orderType: string;
  residentId: number;
  rating: number;
  tags?: string[] | null;
  content?: string | null;
  createdAt: string;
}

/**
 * 提交评价
 * POST /reviews
 * 成功后订单状态自动由 PENDING_REVIEW 变更为 REVIEWED
 */
export function submitReview(params: SubmitReviewParams): Promise<ReviewDto> {
  return request<ReviewDto>('POST', '/reviews', params as unknown as Record<string, unknown>);
}
