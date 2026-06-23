import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 投诉 DTO ─────────────────────────────────────────────────────────────────

export interface ComplaintItem {
  id: number;
  complaintNo: string;
  orderType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  consultOrderId?: number | null;
  reason: string;
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
  evidenceImages?: string[] | null;
  residentId?: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryComplaintParams {
  page?: number;
  pageSize?: number;
  status?: string;
  orderType?: string;
  orderId?: number;
  residentId?: number;
  workerId?: number;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 投诉列表（支持按 workerId 筛选关联该员工订单的投诉） */
export const fetchComplaints = (params?: QueryComplaintParams) =>
  request.get<ApiResponse<PagedResponse<ComplaintItem>>>('/complaints', { params });
