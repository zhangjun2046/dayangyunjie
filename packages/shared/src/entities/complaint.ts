import type { OrderType } from '../constants';
import type { ComplaintStatus } from '../enums';

/** 投诉（API 出参） */
export interface ComplaintDto {
  id: number;
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  consultOrderId?: number | null;
  orderType: OrderType;
  reasonConfigId?: number | null;
  reasonLabel: string;
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
