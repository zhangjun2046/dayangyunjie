import type { RecyclingItemDto } from '@dayangyunjie/shared';
import type { PagedResponse } from './cleaning';
import request, { type ApiResponse } from './request';

export type RecyclingItemItem = RecyclingItemDto;

export interface QueryRecyclingItemParams {
  catalogId?: number;
  name?: string;
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateRecyclingItemBody {
  catalogId: number;
  name: string;
  priceText: string;
  icon?: string;
  sortOrder?: number;
}

export type UpdateRecyclingItemBody = Partial<Omit<CreateRecyclingItemBody, 'icon'>> & {
  /** 传 null 表示清除已配置的图标。 */
  icon?: string | null;
};

export const fetchRecyclingItems = (params?: QueryRecyclingItemParams) =>
  request.get<ApiResponse<PagedResponse<RecyclingItemItem>>>('/recycling-items', { params });

export const fetchEnabledRecyclingItems = (catalogId: number) =>
  request.get<ApiResponse<RecyclingItemItem[]>>('/recycling-items/enabled', {
    params: { catalogId },
  });

export const createRecyclingItem = (body: CreateRecyclingItemBody) =>
  request.post<ApiResponse<RecyclingItemItem>>('/recycling-items', body);

export const updateRecyclingItem = (id: number, body: UpdateRecyclingItemBody) =>
  request.put<ApiResponse<RecyclingItemItem>>(`/recycling-items/${id}`, body);

export const deleteRecyclingItem = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/recycling-items/${id}`);

export const toggleRecyclingItem = (id: number) =>
  request.patch<ApiResponse<RecyclingItemItem>>(`/recycling-items/${id}/toggle`);
