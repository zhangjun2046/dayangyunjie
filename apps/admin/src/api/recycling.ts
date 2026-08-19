import request from './request';
import type { ApiResponse } from './request';

// ─── 地址快照 ─────────────────────────────────────────────────────────────────

export interface AddressSnapshot {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  buildingInfo?: string;
  contactName?: string;
  contactPhone?: string;
}

// ─── 状态枚举 ─────────────────────────────────────────────────────────────────

export type RecyclingOrderStatus =
  | 'PENDING_ASSIGN'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_SERVICE'
  | 'PENDING_REVIEW'
  | 'REVIEWED'
  | 'CANCELLED';

// ─── 作业照片 ─────────────────────────────────────────────────────────────────

export interface WorkPhotoDto {
  id: number;
  photoType: 'BEFORE' | 'AFTER';
  url: string;
  createdAt: string;
}

// ─── 列表项 DTO ───────────────────────────────────────────────────────────────

export interface RecyclingOrderItem {
  id: number;
  orderNo: string;
  status: RecyclingOrderStatus;
  serviceItem: string;
  estimatedWeight: number;
  appointDate: string;
  appointTimeSlot: string;
  contactName: string;
  contactPhone: string;
  isProxyOrder: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  source?: string | null;
  remark?: string | null;
  addressSnapshot?: AddressSnapshot | null;
  worker?: { id: number; name: string; phone: string; gender?: string | null } | null;
  resident?: { id: number; name?: string | null; phone?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 详情 DTO ─────────────────────────────────────────────────────────────────

export interface RecyclingOrderDetail extends RecyclingOrderItem {
  workPhotos?: WorkPhotoDto[];
}

// ─── 评价 DTO ─────────────────────────────────────────────────────────────────

export interface ReviewDto {
  id: number;
  rating: number;
  tags: string[];
  content?: string | null;
  images?: string[];
  createdAt: string;
}

// ─── 分页响应 ─────────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryRecyclingOrderParams {
  page?: number;
  pageSize?: number;
  status?: RecyclingOrderStatus;
  keyword?: string;
  appointDateFrom?: string;
  appointDateTo?: string;
  workerId?: number;
}

// ─── 新增废品订单 DTO ─────────────────────────────────────────────────────────

export interface CreateRecyclingOrderDto {
  /** 服务类型（来自 RECYCLING 目录） */
  serviceItem: string;
  /** 预估重量（kg） */
  estimatedWeight: number;
  /** 预约日期 YYYY-MM-DD */
  appointDate: string;
  /** 预约起始时段（如 14:00） */
  appointTimeSlot: string;
  /** 联系人姓名 */
  contactName: string;
  /** 联系人电话 */
  contactPhone: string;
  /** 地址文本（管理后台代下单，与 addressId 二选一） */
  addressSnapshotText?: string;
  /** 是否代下单 */
  isProxyOrder?: boolean;
  /** 被服务人姓名（代下单必填） */
  serviceContactName?: string;
  /** 被服务人电话（代下单必填） */
  serviceContactPhone?: string;
  /** 订单来源：管理后台固定 PHONE */
  source?: 'PHONE' | 'MINIPROGRAM';
  /** 备注 */
  remark?: string;
  /** residentId 可选（管理后台代创建，无关联居民时不传） */
  residentId?: number;
  /** addressId 可选（管理后台可不传） */
  addressId?: number;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 废品订单分页列表 */
export const fetchRecyclingOrders = (params: QueryRecyclingOrderParams) =>
  request.get<ApiResponse<PagedResponse<RecyclingOrderItem>>>('/recycling-orders', { params });

/** 废品订单详情（含 workPhotos） */
export const fetchRecyclingOrderDetail = (id: number) =>
  request.get<ApiResponse<RecyclingOrderDetail>>(`/recycling-orders/${id}`);

/** 新增废品订单（管理后台代创建） */
export const createRecyclingOrder = (data: CreateRecyclingOrderDto) =>
  request.post<ApiResponse<RecyclingOrderDetail>>('/recycling-orders', data);

/** 派单：PENDING_ASSIGN → ASSIGNED */
export const assignRecyclingOrder = (id: number, workerId: number, operatorId?: number) =>
  request.post<ApiResponse<RecyclingOrderDetail>>(`/recycling-orders/${id}/assign`, {
    workerId,
    operatorId: operatorId ?? 1,
  });

/** 查询订单评价（REVIEWED 状态详情页用） */
export const fetchOrderReview = (orderId: number) =>
  request.get<ApiResponse<PagedResponse<ReviewDto>>>('/reviews', {
    params: { orderType: 'RECYCLING', orderId, pageSize: 1 },
  });
