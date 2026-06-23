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
  name?: string;
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

// ─── 新增 / 编辑 Body ─────────────────────────────────────────────────────────

export interface CreateServiceCatalogBody {
  bizType: 'CLEANING' | 'RECYCLING' | 'CONSULT';
  name: string;
  subtitle?: string;
  icon?: string;
  sortOrder?: number;
}

export type UpdateServiceCatalogBody = Partial<CreateServiceCatalogBody>;

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 服务目录列表（新增订单服务类型下拉 / 管理页用，不传 isEnabled 则返回全部） */
export const fetchServiceCatalogs = (params?: QueryServiceCatalogParams) =>
  request.get<ApiResponse<PagedResponse<ServiceCatalogItem>>>('/service-catalogs', { params });

/** 新增服务目录 */
export const createServiceCatalog = (body: CreateServiceCatalogBody) =>
  request.post<ApiResponse<ServiceCatalogItem>>('/service-catalogs', body);

/** 编辑服务目录 */
export const updateServiceCatalog = (id: number, body: UpdateServiceCatalogBody) =>
  request.put<ApiResponse<ServiceCatalogItem>>(`/service-catalogs/${id}`, body);

/** 删除服务目录 */
export const deleteServiceCatalog = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/service-catalogs/${id}`);

/** 切换启用 / 停用状态 */
export const toggleServiceCatalog = (id: number) =>
  request.patch<ApiResponse<ServiceCatalogItem>>(`/service-catalogs/${id}/toggle`);
