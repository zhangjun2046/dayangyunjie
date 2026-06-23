import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 投诉 DTO ─────────────────────────────────────────────────────────────────

export type ComplaintStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED';

export interface ComplaintItem {
  id: number;
  complaintNo: string;
  orderType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  consultOrderId?: number | null;
  reason: string;
  description: string;
  status: ComplaintStatus;
  evidenceImages?: string[] | null;
  residentId?: number | null;
  /** 关联订单编号 */
  orderNo: string | null;
  /** 服务类型（保洁项目 / 废品类型 / 咨询类型） */
  serviceType: string | null;
  /** 服务地址 */
  serviceAddress: string | null;
  /** 客户姓名（来自关联订单或居民档案） */
  contactName: string | null;
  /** 客户联系方式 */
  contactPhone: string | null;
  /** 是否代下单 */
  isProxyOrder: boolean;
  /** 被服务人姓名 */
  serviceContactName: string | null;
  /** 被服务人联系方式 */
  serviceContactPhone: string | null;
  /** 订单来源（PHONE / MINIAPP） */
  orderSource: string | null;
  /** 备注 */
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintFollowUp {
  id: number;
  complaintId: number;
  handlerName: string;
  content: string;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintItem {
  followUps: ComplaintFollowUp[];
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
  keyword?: string;
}

export interface UpdateComplaintStatusDto {
  status: 'PROCESSING' | 'COMPLETED';
  operatorName: string;
  remark?: string;
}

export interface CreateFollowUpDto {
  handlerName: string;
  content: string;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 投诉列表（支持按 workerId 筛选关联该员工订单的投诉） */
export const fetchComplaints = (params?: QueryComplaintParams) =>
  request.get<ApiResponse<PagedResponse<ComplaintItem>>>('/complaints', { params });

/** 投诉详情（含 followUps + 关联订单信息） */
export const fetchComplaintDetail = (id: number) =>
  request.get<ApiResponse<ComplaintDetail>>(`/complaints/${id}`);

/** 更新投诉状态（PENDING→PROCESSING→COMPLETED） */
export const updateComplaintStatus = (id: number, dto: UpdateComplaintStatusDto) =>
  request.patch<ApiResponse<ComplaintItem>>(`/complaints/${id}/status`, dto);

/** 添加投诉跟进记录 */
export const addComplaintFollowUp = (id: number, dto: CreateFollowUpDto) =>
  request.post<ApiResponse<ComplaintFollowUp>>(`/complaints/${id}/follow-ups`, dto);
