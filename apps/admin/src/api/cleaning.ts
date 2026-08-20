import request from './request';
import type { ApiResponse } from './request';
import type { ProgressNodeDto } from '@dayangyunjie/shared';

// ─── 地址快照（Prisma Json 列，后端已反序列化为对象） ───────────────────────────────────

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

export type CleaningOrderStatus =
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

export interface CleaningOrderItem {
  id: number;
  orderNo: string;
  status: CleaningOrderStatus;
  serviceItem: string;
  serviceDuration: number;
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

export interface CleaningOrderDetail extends CleaningOrderItem {
  workPhotos?: WorkPhotoDto[];
  progress: ProgressNodeDto[];
}

// ─── 评价 DTO（详情页加载用） ─────────────────────────────────────────────────

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

export interface QueryCleaningOrderParams {
  page?: number;
  pageSize?: number;
  status?: CleaningOrderStatus;
  /** 客户联系方式（手机号模糊匹配） */
  contactPhone?: string;
  /** 服务地址关键词（地址快照模糊匹配） */
  address?: string;
  /** 关键词（订单号/客户姓名） */
  keyword?: string;
}

// ─── 新增保洁订单 DTO ─────────────────────────────────────────────────────────

export interface CreateCleaningOrderDto {
  /** 服务项目名称（来自 ServiceCatalog） */
  serviceItem: string;
  /** 服务时长（小时） */
  serviceDuration: number;
  /** 预约日期 YYYY-MM-DD */
  appointDate: string;
  /** 预约时段 */
  appointTimeSlot: string;
  /** 联系人姓名 */
  contactName: string;
  /** 联系人电话 */
  contactPhone: string;
  /** 地址文本（管理后台代下单，与 addressId 二选一，直接传快照文字） */
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

/** 保洁订单分页列表 */
export const fetchCleaningOrders = (params: QueryCleaningOrderParams) =>
  request.get<ApiResponse<PagedResponse<CleaningOrderItem>>>('/cleaning-orders', { params });

/** 保洁订单详情（含 workPhotos） */
export const fetchCleaningOrderDetail = (id: number) =>
  request.get<ApiResponse<CleaningOrderDetail>>(`/cleaning-orders/${id}`);

/** 新增保洁订单（管理后台代创建） */
export const createCleaningOrder = (data: CreateCleaningOrderDto) =>
  request.post<ApiResponse<CleaningOrderDetail>>('/cleaning-orders', data);

/** 派单：PENDING_ASSIGN → ASSIGNED */
export const assignCleaningOrder = (
  id: number,
  workerId: number,
  operatorId?: number,
) =>
  request.post<ApiResponse<CleaningOrderDetail>>(`/cleaning-orders/${id}/assign`, {
    workerId,
    operatorId: operatorId ?? 1,
  });

/** 改派：仅 ASSIGNED（员工尚未接单）订单可用 */
export const reassignCleaningOrder = (
  id: number,
  workerId: number,
  operatorId: number,
) =>
  request.post<ApiResponse<CleaningOrderDetail>>(`/cleaning-orders/${id}/reassign`, {
    workerId,
    operatorId,
  });

/** 查询订单评价（REVIEWED 状态详情页用） */
export const fetchOrderReview = (orderId: number) =>
  request.get<ApiResponse<PagedResponse<ReviewDto>>>('/reviews', {
    params: { orderType: 'CLEANING', orderId, pageSize: 1 },
  });
