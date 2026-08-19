/**
 * 保洁订单 API
 */

import { request } from './request';

export interface CreateCleaningOrderParams {
  residentId: number;
  serviceItem: string;
  serviceDuration: number;
  appointDate: string;
  appointTimeSlot: string;
  addressId: number;
  contactName: string;
  contactPhone: string;
  isProxyOrder?: boolean;
  serviceContactName?: string;
  serviceContactPhone?: string;
  source?: string;
  remark?: string;
}

/** 服务作业照片（服务前/服务后） */
export interface WorkPhotoDto {
  id: number;
  photoType: 'BEFORE' | 'AFTER';
  url: string;
  createdAt: string;
}

export interface CleaningOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  serviceItem: string;
  serviceDuration: number;
  appointDate: string;
  appointTimeSlot: string;
  status: string;
  addressSnapshot?: Record<string, unknown> | null;
  contactName: string;
  contactPhone: string;
  isProxyOrder?: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  workerId?: number | null;
  /** 已派单时携带服务人员基本信息；详情含 gender */
  worker?: { id: number; name: string; phone: string; gender?: string | null } | null;
  remark?: string | null;
  /** 服务前/服务后照片（完成服务后由员工端上传） */
  workPhotos?: WorkPhotoDto[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryCleaningOrderParams {
  residentId?: number;
  status?: string;
  /** 逗号分隔多状态，如 PENDING_ASSIGN,ASSIGNED,ACCEPTED */
  statuses?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 创建保洁订单
 * POST /cleaning-orders
 * 成功返回包含 CLN 前缀订单号的订单对象
 */
export function createCleaningOrder(params: CreateCleaningOrderParams): Promise<CleaningOrderDto> {
  return request<CleaningOrderDto>(
    'POST',
    '/cleaning-orders',
    params as unknown as Record<string, unknown>,
  );
}

/**
 * 查询保洁订单列表（分页）
 * GET /cleaning-orders
 */
export function fetchCleaningOrderList(
  params: QueryCleaningOrderParams,
): Promise<OrderListResult<CleaningOrderDto>> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<OrderListResult<CleaningOrderDto>>('GET', `/cleaning-orders${query ? `?${query}` : ''}`);
}

/**
 * 查询保洁订单详情
 * GET /cleaning-orders/:id
 */
export function fetchCleaningOrderDetail(id: number): Promise<CleaningOrderDto> {
  return request<CleaningOrderDto>('GET', `/cleaning-orders/${id}`);
}

/**
 * 取消保洁订单（仅 PENDING_ASSIGN 状态可取消）
 * POST /cleaning-orders/:id/cancel
 */
export function cancelCleaningOrder(id: number, operatorId: number): Promise<CleaningOrderDto> {
  return request<CleaningOrderDto>('POST', `/cleaning-orders/${id}/cancel`, {
    operatorId,
    operatorType: 'RESIDENT',
    remark: '居民主动取消',
  });
}
