import type { OrderType } from '../constants';

/** 提交投诉 */
export interface CreateComplaintDto {
  orderType: OrderType;
  orderId: number;
  /** 所选投诉原因配置 id，多选，至少 1 项；文案由服务端查配置后落快照 */
  reasonConfigIds: number[];
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
