import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 员工 DTO ─────────────────────────────────────────────────────────────────

export interface WorkerListItem {
  id: number;
  name: string;
  phone: string;
  employeeNo: string;
  skills: string[];
  status: 'IDLE' | 'BUSY';
  rating: number;
  totalOrders: number;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryWorkerParams {
  page?: number;
  pageSize?: number;
  name?: string;
  phone?: string;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 员工列表（分配弹窗用，拉取 IDLE 员工） */
export const fetchWorkers = (params?: QueryWorkerParams) =>
  request.get<ApiResponse<PagedResponse<WorkerListItem>>>('/workers', { params });
