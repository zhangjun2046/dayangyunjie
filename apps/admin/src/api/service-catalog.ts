import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 服务目录 DTO ─────────────────────────────────────────────────────────────

export interface ServiceCatalogItem {
  id: number;
  bizType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  name: string;
  subtitle?: string | null;
  icon?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryServiceCatalogParams {
  bizType?: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 服务目录列表（新增订单服务类型下拉用） */
export const fetchServiceCatalogs = (params?: QueryServiceCatalogParams) =>
  request.get<ApiResponse<PagedResponse<ServiceCatalogItem>>>('/service-catalogs', { params });
