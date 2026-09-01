import type { RecyclingItemDto } from '@dayangyunjie/shared';
import { request } from './request';

/** 查询某废品分类下启用中的回收品项（父分类也须启用） */
export function fetchEnabledRecyclingItems(catalogId: number): Promise<RecyclingItemDto[]> {
  return request<RecyclingItemDto[]>('GET', '/recycling-items/enabled', { catalogId });
}
