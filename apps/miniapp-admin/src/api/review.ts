/**
 * 订单评价查询（REVIEWED 状态详情只读展示）
 */

import { request } from './request';

export interface ReviewDto {
  id: number;
  rating: number;
  tags: string[];
  content: string | null;
  images: string[] | null;
  createdAt: string;
}

export async function fetchOrderReview(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
): Promise<ReviewDto | null> {
  const backendType = orderType === 'cleaning' ? 'CLEANING' : 'RECYCLING';
  try {
    const res = await request<{ items: ReviewDto[]; total: number }>('GET', '/reviews', {
      orderType: backendType,
      orderId,
      pageSize: 1,
      page: 1,
    });
    const items = res?.items ?? [];
    return items.length > 0 ? items[0]! : null;
  } catch (err: unknown) {
    console.info(
      '[admin-review] fetchOrderReview failed',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
