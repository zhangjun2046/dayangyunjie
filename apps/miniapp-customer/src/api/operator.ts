/**
 * 运营人员 API
 * 对接后端 GET /operators/contact（返回用途=接单的第一条记录）
 */
import { request } from './request';

export interface OperatorDto {
  id: number;
  name: string;
  phone: string;
  purpose: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取接单运营人员联系信息（用于首页客服电话）
 * 无接单人员时后端返回 data: null
 */
export function fetchContactOperator(): Promise<OperatorDto | null> {
  return request<OperatorDto | null>('GET', '/operators/contact');
}
