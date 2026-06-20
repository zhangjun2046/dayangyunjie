/**
 * Banner 轮播图 API
 * 对接后端 GET /banners/active?displayTarget=RESIDENT
 */
import { request } from './request';

export interface BannerDto {
  id: number;
  imageUrl: string;
  title: string | null;
  displayTarget: 'RESIDENT' | 'WORKER' | 'ALL';
  linkType: 'NONE' | 'PAGE' | 'URL';
  linkTarget: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 查询当前有效的居民端轮播图
 * isEnabled=true 且当前时间在 startTime~endTime 内，按 sortOrder 升序
 */
export function fetchActiveBanners(): Promise<BannerDto[]> {
  return request<BannerDto[]>('GET', '/banners/active', { displayTarget: 'RESIDENT' });
}
