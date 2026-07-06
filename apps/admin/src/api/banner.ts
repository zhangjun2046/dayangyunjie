import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';
import type { BannerDisplayTarget, BannerDto, BannerLinkType } from '@dayangyunjie/shared';

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryBannerParams {
  page?: number;
  pageSize?: number;
  displayTarget?: BannerDisplayTarget;
  isEnabled?: boolean;
  title?: string;
}

// ─── 新增 / 编辑 Body ─────────────────────────────────────────────────────────

export interface CreateBannerBody {
  imageUrl: string;
  title?: string;
  displayTarget?: BannerDisplayTarget;
  linkType?: BannerLinkType;
  linkTarget?: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export type UpdateBannerBody = Partial<CreateBannerBody>;

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 轮播图列表（分页，支持 displayTarget/isEnabled/title 筛选） */
export const fetchBanners = (params?: QueryBannerParams) =>
  request.get<ApiResponse<PagedResponse<BannerDto>>>('/banners', { params });

/** 新增轮播图 */
export const createBanner = (payload: CreateBannerBody) =>
  request.post<ApiResponse<BannerDto>>('/banners', payload);

/** 编辑轮播图 */
export const updateBanner = (id: number, payload: UpdateBannerBody) =>
  request.put<ApiResponse<BannerDto>>(`/banners/${id}`, payload);

/** 删除轮播图 */
export const deleteBanner = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/banners/${id}`);
