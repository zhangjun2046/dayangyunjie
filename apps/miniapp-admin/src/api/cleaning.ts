import { request } from './request';
import type { OrderStatus, ProgressNodeDto } from '@dayangyunjie/shared';

export interface AddressSnapshot {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  buildingInfo?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkPhotoDto {
  id: number;
  photoType: 'BEFORE' | 'AFTER' | string;
  url: string;
  createdAt?: string;
}

export interface CleaningOrderItem {
  id: number;
  orderNo: string;
  status: OrderStatus;
  serviceItem: string;
  serviceDuration?: number;
  appointDate: string;
  appointTimeSlot: string;
  contactName: string;
  contactPhone: string;
  isProxyOrder?: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  remark?: string | null;
  addressSnapshot?: AddressSnapshot | null;
  worker?: { id: number; name: string; phone: string } | null;
}

export interface CleaningOrderDetail extends CleaningOrderItem {
  workPhotos?: WorkPhotoDto[];
  progress: ProgressNodeDto[];
}

export interface QueryCleaningOrderParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  keyword?: string;
}

export function fetchCleaningOrders(
  params: QueryCleaningOrderParams,
): Promise<PagedResponse<CleaningOrderItem>> {
  const data: Record<string, unknown> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };
  if (params.status) data.status = params.status;
  if (params.keyword?.trim()) data.keyword = params.keyword.trim();
  return request<PagedResponse<CleaningOrderItem>>('GET', '/cleaning-orders', data);
}

export function fetchCleaningOrderDetail(id: number): Promise<CleaningOrderDetail> {
  return request<CleaningOrderDetail>('GET', `/cleaning-orders/${id}`);
}

export function assignCleaningOrder(
  id: number,
  workerId: number,
  operatorId: number,
): Promise<CleaningOrderDetail> {
  return request<CleaningOrderDetail>('POST', `/cleaning-orders/${id}/assign`, {
    workerId,
    operatorId,
  });
}

export function reassignCleaningOrder(
  id: number,
  workerId: number,
  operatorId: number,
): Promise<CleaningOrderDetail> {
  return request<CleaningOrderDetail>('POST', `/cleaning-orders/${id}/reassign`, {
    workerId,
    operatorId,
  });
}
