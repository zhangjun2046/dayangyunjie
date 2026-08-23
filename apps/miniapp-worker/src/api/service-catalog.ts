/**
 * 员工端服务目录 API。
 * 订单仅保存服务名称，因此列表展示图标时需通过目录名称反查后台配置。
 */

import { request } from './request';

export type ServiceCatalogBizType = 'CLEANING' | 'RECYCLING';

export interface ServiceCatalogDto {
  id: number;
  bizType: string;
  name: string;
  icon: string | null;
  isEnabled: boolean;
}

interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取员工订单所需的保洁、回收服务目录。
 * 不限制启用状态，确保已经停用的历史服务仍能匹配其配置图标。
 */
export async function fetchWorkerServiceCatalogs(): Promise<ServiceCatalogDto[]> {
  const result = await request<PagedResult<ServiceCatalogDto>>('GET', '/service-catalogs', {
    page: 1,
    pageSize: 100,
  });

  const catalogs = (result.items ?? []).filter(
    (item) => item.bizType === 'CLEANING' || item.bizType === 'RECYCLING',
  );
  console.info('[worker-service-catalog] catalogs loaded, count=', catalogs.length);
  return catalogs;
}
