/**
 * 家政咨询单 API
 * POST /consult-orders — 创建咨询单，返回 CNS 前缀订单号
 */

import { request } from './request';
import type { ProgressNodeDto } from '@dayangyunjie/shared';

export interface CreateConsultOrderParams {
  serviceType: string;
  contactName: string;
  contactPhone: string;
  requirementDesc: string;
  residentId?: number;
  isProxyOrder?: boolean;
  serviceContactName?: string;
  serviceContactPhone?: string;
  source?: string;
  remark?: string;
}

export interface ConsultOrderDto {
  id: number;
  orderNo: string;
  serviceType: string;
  contactName: string;
  contactPhone: string;
  requirementDesc: string;
  status: string;
  residentId?: number | null;
  isProxyOrder?: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  source?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultOrderDetailDto extends ConsultOrderDto {
  progress: ProgressNodeDto[];
}

export interface OrderListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryConsultOrderParams {
  residentId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 创建家政咨询单
 * POST /consult-orders
 * 成功返回包含 CNS 前缀订单号的咨询单对象
 */
export function createConsultOrder(params: CreateConsultOrderParams): Promise<ConsultOrderDto> {
  return request<ConsultOrderDto>(
    'POST',
    '/consult-orders',
    params as unknown as Record<string, unknown>,
  );
}

/**
 * 查询家政咨询单列表（分页）
 * GET /consult-orders
 */
export function fetchConsultOrderList(
  params: QueryConsultOrderParams,
): Promise<OrderListResult<ConsultOrderDto>> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<OrderListResult<ConsultOrderDto>>('GET', `/consult-orders${query ? `?${query}` : ''}`);
}

/**
 * 查询家政咨询单详情
 * GET /consult-orders/:id
 */
export function fetchConsultOrderDetail(id: number): Promise<ConsultOrderDetailDto> {
  return request<ConsultOrderDetailDto>('GET', `/consult-orders/${id}`);
}
