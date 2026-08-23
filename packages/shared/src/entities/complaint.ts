import type { OrderType } from '../constants';
import type { ComplaintStatus } from '../enums';

/**
 * 投诉原因快照：提交时把所选配置的 id 与当时文案一并落库。
 * 不做外键关联，配置后续改名或删除都不影响历史投诉的展示。
 */
export interface ComplaintReasonSnapshot {
  configId: number;
  label: string;
}

/** 投诉（API 出参） */
export interface ComplaintDto {
  id: number;
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  consultOrderId?: number | null;
  orderType: OrderType;
  reasons: ComplaintReasonSnapshot[];
  description: string;
  evidenceImages?: string[] | null;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
}

/** 投诉跟进记录 */
export interface ComplaintFollowUpDto {
  id: number;
  complaintId: number;
  handlerName: string;
  content: string;
  createdAt: string;
}
