/**
 * 投诉 API
 * POST /complaints — 提交投诉，初始 status: PENDING
 *
 * 业务规则：仅订单状态 >= ACCEPTED（ACCEPTED/IN_SERVICE/PENDING_REVIEW/REVIEWED）可提交投诉
 */

import { request } from './request';

/**
 * 投诉原因快照：提交时后端按所选配置写入 id 与当时文案。
 * 配置后续被改名或删除都不影响历史投诉的展示。
 */
export interface ComplaintReasonSnapshot {
  configId: number;
  label: string;
}

/** 将投诉原因快照数组转为展示文案 */
export function formatComplaintReasons(
  reasons: ComplaintReasonSnapshot[] | undefined | null,
): string {
  if (!reasons?.length) return '';
  return reasons
    .map((r) => r?.label)
    .filter((label): label is string => Boolean(label))
    .join('、');
}

export interface SubmitComplaintParams {
  /** 订单类型 */
  orderType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  /** 订单 ID */
  orderId: number;
  /** 所选投诉原因配置 ID（可多选，至少 1 项） */
  reasonConfigIds: number[];
  /** 投诉描述（必填，最长 1000 字符） */
  description: string;
  /** 凭证图片 URL 列表（可选） */
  evidenceImages?: string[];
  /** 居民用户 ID（用于记录归属，便于"我的投诉"查询） */
  residentId?: number;
}

export type ComplaintStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED';

/** 投诉状态中文标签 */
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
};

export interface ComplaintDto {
  id: number;
  orderType: string;
  cleaningOrderId: number | null;
  recyclingOrderId: number | null;
  consultOrderId: number | null;
  reasons: ComplaintReasonSnapshot[];
  description: string;
  status: ComplaintStatus;
  evidenceImages?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintFollowUpDto {
  id: number;
  complaintId: number;
  handlerName: string;
  content: string;
  createdAt: string;
}

export interface GetComplaintsParams {
  status?: ComplaintStatus;
  orderType?: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  orderId?: number;
  residentId?: number;
  page?: number;
  pageSize?: number;
}

export interface ComplaintPageResult {
  items: ComplaintDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 提交投诉
 * POST /complaints
 */
export function submitComplaint(params: SubmitComplaintParams): Promise<ComplaintDto> {
  return request<ComplaintDto>(
    'POST',
    '/complaints',
    params as unknown as Record<string, unknown>,
  );
}

/**
 * 查询投诉列表
 * GET /complaints
 */
export function getComplaints(params: GetComplaintsParams = {}): Promise<ComplaintPageResult> {
  const query: Record<string, unknown> = {};
  if (params.status) query.status = params.status;
  if (params.orderType) query.orderType = params.orderType;
  if (params.orderId) query.orderId = params.orderId;
  if (params.residentId) query.residentId = params.residentId;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;
  return request<ComplaintPageResult>('GET', '/complaints', query);
}

/**
 * 查询投诉详情（含跟进记录）
 * GET /complaints/:id
 */
export function getComplaintById(id: number): Promise<ComplaintDto & { followUps: ComplaintFollowUpDto[] }> {
  return request<ComplaintDto & { followUps: ComplaintFollowUpDto[] }>('GET', `/complaints/${id}`);
}
