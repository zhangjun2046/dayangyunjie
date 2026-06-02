import type { OrderType } from '../constants';

/** 评价（API 出参） */
export interface ReviewDto {
  id: number;
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  orderType: OrderType;
  rating: number;
  tags: string[];
  content?: string | null;
  images?: string[] | null;
  createdAt: string;
}
