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

export interface CleaningOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  serviceItem: string;
  serviceDuration: number;
  appointDate: string;
  appointTimeSlot: string;
  status: string;
  remark?: string;
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
