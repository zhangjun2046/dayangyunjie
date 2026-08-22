import type { OrderType } from '../constants';

/** 提交投诉 */
export interface CreateComplaintDto {
  orderType: OrderType;
  orderId: number;
  reasonConfigId: number;
  description: string;
  evidenceImages?: string[];
}

/** 投诉跟进 */
export interface CreateComplaintFollowUpDto {
  content: string;
  handlerName?: string;
}

/** 更新投诉状态 */
export interface UpdateComplaintStatusDto {
  status: string;
}
