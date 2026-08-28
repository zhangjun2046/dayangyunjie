import request from './request';
import type { ApiResponse } from './request';

// ─── 状态枚举 ─────────────────────────────────────────────────────────────────

export type ConsultOrderStatus = 'FOLLOW_UP' | 'FOLLOWING' | 'COMPLETED';

// ─── 跟进记录 ─────────────────────────────────────────────────────────────────

export interface ConsultFollowUp {
  id: number;
  consultId: number;
  handlerName: string;
  content: string;
  createdAt: string;
}

export interface CompletionRecord {
  handlerName: string;
  content: string;
  completedAt: string;
}

// ─── 列表项 DTO ───────────────────────────────────────────────────────────────

export interface ConsultOrderItem {
  id: number;
  orderNo: string;
  status: ConsultOrderStatus;
  serviceType: string;
  requirementDesc: string;
  contactName: string;
  contactPhone: string;
  isProxyOrder: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  serviceAddress?: string | null;
  source?: string | null;
  remark?: string | null;
  resident?: { id: number; name?: string | null; phone?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 详情 DTO ─────────────────────────────────────────────────────────────────

export interface ConsultOrderDetail extends ConsultOrderItem {
  followUps?: ConsultFollowUp[];
  completionRecord?: CompletionRecord | null;
}

// ─── 分页响应 ─────────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryConsultOrderParams {
  page?: number;
  pageSize?: number;
  status?: ConsultOrderStatus;
  serviceType?: string;
  keyword?: string;
  contactPhone?: string;
}

// ─── 新增咨询单 DTO ───────────────────────────────────────────────────────────

export interface CreateConsultOrderDto {
  /** 服务类型（来自 CONSULT 目录） */
  serviceType: string;
  /** 核心诉求（必填） */
  requirementDesc: string;
  /** 联系人姓名（必填） */
  contactName: string;
  /** 联系人电话（必填） */
  contactPhone: string;
  /** 服务地址（可选，运营电话回访后录入） */
  serviceAddress?: string;
  /** 是否代下单 */
  isProxyOrder?: boolean;
  /** 被服务人姓名（代下单必填） */
  serviceContactName?: string;
  /** 被服务人电话（代下单必填） */
  serviceContactPhone?: string;
  /** 订单来源：管理后台固定 PHONE */
  source?: 'PHONE' | 'MINIPROGRAM';
  /** 备注 */
  remark?: string;
  /** residentId 可选 */
  residentId?: number;
}

// ─── 更新状态 DTO ─────────────────────────────────────────────────────────────

export interface UpdateConsultStatusDto {
  status: ConsultOrderStatus;
  operatorId: number;
  remark?: string;
  /** 完成时的处理人姓名（写入完成节点） */
  handlerName?: string;
}

// ─── 新增跟进记录 DTO ─────────────────────────────────────────────────────────

export interface CreateFollowUpDto {
  handlerName: string;
  content: string;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 咨询单分页列表 */
export const fetchConsultOrders = (params: QueryConsultOrderParams) =>
  request.get<ApiResponse<PagedResponse<ConsultOrderItem>>>('/consult-orders', { params });

/** 咨询单详情 */
export const fetchConsultOrderDetail = (id: number) =>
  request.get<ApiResponse<ConsultOrderDetail>>(`/consult-orders/${id}`);

/** 新增咨询单（管理后台代创建） */
export const createConsultOrder = (data: CreateConsultOrderDto) =>
  request.post<ApiResponse<ConsultOrderDetail>>('/consult-orders', data);

/** 更新咨询单状态（FOLLOW_UP → FOLLOWING → COMPLETED） */
export const updateConsultStatus = (id: number, data: UpdateConsultStatusDto) =>
  request.patch<ApiResponse<ConsultOrderDetail>>(`/consult-orders/${id}/status`, data);

/** 获取跟进记录列表（按时间升序） */
export const fetchConsultFollowUps = (id: number, params?: { page?: number; pageSize?: number }) =>
  request.get<ApiResponse<PagedResponse<ConsultFollowUp>>>(`/consult-orders/${id}/follow-ups`, { params });

/** 新增跟进记录 */
export const createConsultFollowUp = (id: number, data: CreateFollowUpDto) =>
  request.post<ApiResponse<ConsultFollowUp>>(`/consult-orders/${id}/follow-ups`, data);
