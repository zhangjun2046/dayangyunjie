import { request } from './request';
import type { OrderStatus, ProgressNodeDto, RecyclingOrderSelectedItem } from '@dayangyunjie/shared';
import type { AddressSnapshot, PagedResponse, WorkPhotoDto } from './cleaning';

export interface RecyclingOrderItem {
  id: number;
  orderNo: string;
  status: OrderStatus;
  serviceItem: string;
  estimatedWeight?: number;
  selectedItems?: RecyclingOrderSelectedItem[] | null;
  hasElevator?: boolean | null;
  carryFloor?: number | null;
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

export interface RecyclingOrderDetail extends RecyclingOrderItem {
  workPhotos?: WorkPhotoDto[];
  progress: ProgressNodeDto[];
}

export interface QueryRecyclingOrderParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  keyword?: string;
}

export function fetchRecyclingOrders(
  params: QueryRecyclingOrderParams,
): Promise<PagedResponse<RecyclingOrderItem>> {
  const data: Record<string, unknown> = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };
  if (params.status) data.status = params.status;
  if (params.keyword?.trim()) data.keyword = params.keyword.trim();
  return request<PagedResponse<RecyclingOrderItem>>('GET', '/recycling-orders', data);
}

export function fetchRecyclingOrderDetail(id: number): Promise<RecyclingOrderDetail> {
  return request<RecyclingOrderDetail>('GET', `/recycling-orders/${id}`);
}

export function assignRecyclingOrder(
  id: number,
  workerId: number,
  operatorId: number,
): Promise<RecyclingOrderDetail> {
  return request<RecyclingOrderDetail>('POST', `/recycling-orders/${id}/assign`, {
    workerId,
    operatorId,
  });
}

export function reassignRecyclingOrder(
  id: number,
  workerId: number,
  operatorId: number,
): Promise<RecyclingOrderDetail> {
  return request<RecyclingOrderDetail>('POST', `/recycling-orders/${id}/reassign`, {
    workerId,
    operatorId,
  });
}
