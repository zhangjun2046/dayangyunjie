import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 运营人员 DTO ──────────────────────────────────────────────────────────────

export interface OperatorItem {
  id: number;
  name: string;
  phone: string;
  purpose: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryOperatorParams {
  page?: number;
  pageSize?: number;
  name?: string;
  phone?: string;
  keyword?: string;
  purpose?: string;
}

// ─── 新增 / 编辑 Body ─────────────────────────────────────────────────────────

export interface CreateOperatorPayload {
  name: string;
  phone: string;
  purpose?: string;
}

export type UpdateOperatorPayload = Partial<CreateOperatorPayload>;

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 运营人员列表（分页，支持 name/phone/purpose 筛选） */
export const fetchOperators = (params?: QueryOperatorParams) =>
  request.get<ApiResponse<PagedResponse<OperatorItem>>>('/operators', { params });

/** 新增运营人员 */
export const createOperator = (payload: CreateOperatorPayload) =>
  request.post<ApiResponse<OperatorItem>>('/operators', payload);

/** 编辑运营人员 */
export const updateOperator = (id: number, payload: UpdateOperatorPayload) =>
  request.put<ApiResponse<OperatorItem>>(`/operators/${id}`, payload);

/** 删除运营人员 */
export const deleteOperator = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/operators/${id}`);
