/**
 * 废品回收订单 API
 */

import { request } from './request';

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
}

export interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  serviceItem: string;
  estimatedWeight: number;
  appointDate: string;
  appointTimeSlot: string;
  status: string;
  remark?: string;
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
