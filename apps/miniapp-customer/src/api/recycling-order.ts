/**
 * 废品回收订单 API
 */

import { request } from './request';
import type { ProgressNodeDto, RecyclingOrderSelectedItem } from '@dayangyunjie/shared';

export interface CreateRecyclingOrderParams {
  residentId: number;
  serviceItem: string;
  estimatedWeight: number;
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
  selectedItems?: RecyclingOrderSelectedItem[];
  hasElevator?: boolean;
  carryFloor?: number;
  itemPhotoUrl?: string;
}

/** 服务作业照片（服务前/服务后） */
export interface WorkPhotoDto {
  id: number;
  photoType: 'BEFORE' | 'AFTER';
  url: string;
  createdAt: string;
}

export interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  serviceItem: string;
  estimatedWeight: number;
  selectedItems?: RecyclingOrderSelectedItem[] | null;
  hasElevator?: boolean | null;
  carryFloor?: number | null;
  itemPhotoUrl?: string | null;
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
  worker?: {
    id: number;
    name: string;
    phone: string;
    gender?: string | null;
    rating?: number;
    totalOrders?: number;
  } | null;
  remark?: string | null;
  /** 服务前/服务后照片（完成服务后由员工端上传） */
  workPhotos?: WorkPhotoDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RecyclingOrderDetailDto extends RecyclingOrderDto {
  progress: ProgressNodeDto[];
}

export interface OrderListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryRecyclingOrderParams {
  residentId?: number;
  status?: string;
  /** 逗号分隔多状态，如 PENDING_ASSIGN,ASSIGNED,ACCEPTED */
  statuses?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 创建废品回收订单
 * POST /recycling-orders
 * 成功返回包含 RCY 前缀订单号的订单对象
 */
export function createRecyclingOrder(
  params: CreateRecyclingOrderParams,
): Promise<RecyclingOrderDto> {
  return request<RecyclingOrderDto>(
    'POST',
    '/recycling-orders',
    params as unknown as Record<string, unknown>,
  );
}

/**
 * 查询废品回收订单列表（分页）
 * GET /recycling-orders
 */
export function fetchRecyclingOrderList(
  params: QueryRecyclingOrderParams,
): Promise<OrderListResult<RecyclingOrderDto>> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<OrderListResult<RecyclingOrderDto>>('GET', `/recycling-orders${query ? `?${query}` : ''}`);
}

/**
 * 查询废品回收订单详情
 * GET /recycling-orders/:id
 */
export function fetchRecyclingOrderDetail(id: number): Promise<RecyclingOrderDetailDto> {
  return request<RecyclingOrderDetailDto>('GET', `/recycling-orders/${id}`);
}

/**
 * 取消废品回收订单（仅 PENDING_ASSIGN 状态可取消）
 * POST /recycling-orders/:id/cancel
 */
export function cancelRecyclingOrder(id: number, operatorId: number): Promise<RecyclingOrderDto> {
  return request<RecyclingOrderDto>('POST', `/recycling-orders/${id}/cancel`, {
    operatorId,
    operatorType: 'RESIDENT',
    remark: '居民主动取消',
  });
}
