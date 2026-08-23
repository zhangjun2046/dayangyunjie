import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import type { PagedResponse } from './cleaning';
import request, { type ApiResponse } from './request';

export interface QueryComplaintReasonConfigParams {
  id?: number;
  label?: string;
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateComplaintReasonConfigBody {
  label: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface UpdateComplaintReasonConfigBody {
  label?: string;
  sortOrder?: number;
}

/** 管理端分页查询投诉原因配置。 */
export const fetchComplaintReasonConfigs = (params?: QueryComplaintReasonConfigParams) =>
  request.get<ApiResponse<PagedResponse<ComplaintReasonConfigDto>>>(
    '/complaint-reason-configs/admin',
    { params },
  );

/** 新增投诉原因配置。 */
export const createComplaintReasonConfig = (body: CreateComplaintReasonConfigBody) =>
  request.post<ApiResponse<ComplaintReasonConfigDto>>('/complaint-reason-configs', body);

/** 按主键更新投诉原因展示文案和排序。 */
export const updateComplaintReasonConfig = (
  id: number,
  body: UpdateComplaintReasonConfigBody,
) =>
  request.put<ApiResponse<ComplaintReasonConfigDto>>(
    `/complaint-reason-configs/${id}`,
    body,
  );

/** 切换投诉原因启用状态。 */
export const toggleComplaintReasonConfig = (id: number) =>
  request.patch<ApiResponse<ComplaintReasonConfigDto>>(
    `/complaint-reason-configs/${id}/toggle`,
  );

/** 按主键删除投诉原因配置。 */
export const deleteComplaintReasonConfig = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/complaint-reason-configs/${id}`);
