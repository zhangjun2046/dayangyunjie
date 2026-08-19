/**
 * 运营人员 API
 * 对接后端 GET /operators（列表有几条返回几条，不做用途筛选）
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

interface OperatorPageResult {
  items: OperatorDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取运营人员联系信息列表（用于忘记密码联系管理员等）
 */
export function fetchContactOperators(): Promise<OperatorDto[]> {
  return request<OperatorPageResult>('GET', '/operators', { page: 1, pageSize: 100 }).then(
    (res) => res?.items ?? [],
  );
}
