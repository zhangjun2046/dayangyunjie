/**
 * 服务目录 API
 * 用于获取保洁/废品回收等服务类型列表
 */

import { request } from './request';

export interface ServiceCatalogDto {
  id: number;
  bizType: string;
  name: string;
  subtitle: string;
  icon: string;
  sortOrder: number;
  isEnabled: boolean;
}

/** 分页外层包装（GET /service-catalogs 返回格式） */
interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取保洁服务目录列表
 * GET /service-catalogs?bizType=CLEANING&isEnabled=true
 */
export async function fetchCleaningCatalogs(): Promise<ServiceCatalogDto[]> {
  const result = await request<PageResult<ServiceCatalogDto>>('GET', '/service-catalogs', {
    bizType: 'CLEANING',
    isEnabled: true,
    pageSize: 50,
  });
  return result.items ?? [];
}

/**
 * 获取废品回收服务目录列表
 * GET /service-catalogs?bizType=RECYCLING&isEnabled=true
 */
export async function fetchRecyclingCatalogs(): Promise<ServiceCatalogDto[]> {
  const result = await request<PageResult<ServiceCatalogDto>>('GET', '/service-catalogs', {
    bizType: 'RECYCLING',
    isEnabled: true,
    pageSize: 50,
  });
  return result.items ?? [];
}
