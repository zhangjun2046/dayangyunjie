/**
 * 员工端评价查询 API
 * 员工端仅需只读展示居民对已完成订单的评价内容（REVIEWED 状态）
 */

import { request } from './request';

/** 后端 ReviewDto 结构（仅员工端展示所需字段） */
export interface ReviewDto {
  id: number;
  rating: number;
  tags: string[];
  content: string | null;
  images: string[] | null;
  createdAt: string;
}

/**
 * 查询订单评价（员工端只读展示，REVIEWED 状态后调用）
 * @param orderType - 'cleaning' | 'recycling'
 * @param orderId   - 订单 ID
 * @returns 评价对象，若尚无评价则返回 null
 */
export async function fetchOrderReview(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
): Promise<ReviewDto | null> {
  const backendType = orderType === 'cleaning' ? 'CLEANING' : 'RECYCLING';
  try {
    const res = await request<{ items: ReviewDto[]; total: number }>(
      'GET',
      '/reviews',
      { orderType: backendType, orderId, pageSize: 1, page: 1 } as unknown as Record<string, unknown>,
    );
    const items: ReviewDto[] = res?.items ?? [];
    console.info('[worker-review] fetchOrderReview orderId=', orderId, 'found=', items.length > 0);
    return items.length > 0 ? items[0] : null;
  } catch (err: unknown) {
    console.info('[worker-review] fetchOrderReview failed, err=', err instanceof Error ? err.message : err);
    return null;
  }
}
