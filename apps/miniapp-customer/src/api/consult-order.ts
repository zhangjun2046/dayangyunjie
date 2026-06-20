/**
 * 家政咨询单 API
 * POST /consult-orders — 创建咨询单，返回 CNS 前缀订单号
 */

import { request } from './request';

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
  isProxyOrder?: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  source?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
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
