import type { AppointTimeLeadDto, AppointTimeSlotBizType, AppointTimeSlotConfigDto } from '@dayangyunjie/shared';
import type { PagedResponse } from './cleaning';
import request, { type ApiResponse } from './request';

export interface QueryAppointTimeSlotParams {
  bizType?: AppointTimeSlotBizType;
  label?: string;
  isEnabled?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateAppointTimeSlotBody {
  bizType: AppointTimeSlotBizType;
  label: string;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface UpdateAppointTimeSlotBody {
  label?: string;
  sortOrder?: number;
}

/** 公开查询某业务已启用预约时段。 */
export const fetchEnabledAppointTimeSlots = (bizType: AppointTimeSlotBizType) =>
  request.get<ApiResponse<AppointTimeSlotConfigDto[]>>('/appoint-time-slots', {
    params: { bizType },
  });

/** 管理端分页查询预约时段配置。 */
export const fetchAppointTimeSlots = (params?: QueryAppointTimeSlotParams) =>
  request.get<ApiResponse<PagedResponse<AppointTimeSlotConfigDto>>>('/appoint-time-slots/admin', {
    params,
  });

export const createAppointTimeSlot = (body: CreateAppointTimeSlotBody) =>
  request.post<ApiResponse<AppointTimeSlotConfigDto>>('/appoint-time-slots', body);

export const updateAppointTimeSlot = (id: number, body: UpdateAppointTimeSlotBody) =>
  request.put<ApiResponse<AppointTimeSlotConfigDto>>(`/appoint-time-slots/${id}`, body);

export const toggleAppointTimeSlot = (id: number) =>
  request.patch<ApiResponse<AppointTimeSlotConfigDto>>(`/appoint-time-slots/${id}/toggle`);

export const deleteAppointTimeSlot = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/appoint-time-slots/${id}`);

export const fetchAppointTimeLeads = () =>
  request.get<ApiResponse<AppointTimeLeadDto>>('/appoint-time-slots/leads');

export const updateAppointTimeLeads = (body: AppointTimeLeadDto) =>
  request.put<ApiResponse<AppointTimeLeadDto>>('/appoint-time-slots/leads', body);
