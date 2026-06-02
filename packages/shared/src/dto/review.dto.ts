import type { OrderType } from '../constants';

/** 提交评价 */
export interface CreateReviewDto {
  orderType: OrderType;
  orderId: number;
  rating: number;
  tags: string[];
  content?: string;
  images?: string[];
}
