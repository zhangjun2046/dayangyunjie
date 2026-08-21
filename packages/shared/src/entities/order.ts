import type { AddressSnapshot } from '../types/address';
import type { ConsultStatus, OrderSource, OrderStatus, PaymentStatus } from '../enums';
import type { WorkPhotoDto } from './work-photo';

export interface ProgressNodeDto {
  /** 同一状态包含多条事件时使用的稳定渲染键 */
  eventKey?: string;
  status: string;
  label: string;
  state: 'done' | 'current' | 'pending';
  message: string | null;
  operatedAt: string | null;
}

/** 保洁订单（API 出参，v2.0：proxyName→serviceContactName，proxyPhone→serviceContactPhone） */
export interface CleaningOrderDto {
  id: number;
  orderNo: string;
  residentId: number | null;
  workerId?: number | null;
  /** 已派单时携带服务人员基本信息；详情含 gender，列表仅 id/name/phone */
  worker?: {
    id: number;
    name: string;
    phone: string;
    gender?: string | null;
    rating?: number;
    totalOrders?: number;
  } | null;
  serviceItem: string;
  serviceDuration: number;
  appointDate: string;
  appointTimeSlot: string;
  addressSnapshot: AddressSnapshot;
  contactName: string;
  contactPhone: string;
  remark?: string | null;
  source: OrderSource;
  isProxyOrder: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  status: OrderStatus;
  referenceAmount?: string | null;
  finalAmount?: string | null;
  paymentStatus: PaymentStatus;
  paidAt?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsCheckinAt?: string | null;
  gpsDistance?: number | null;
  gpsRemark?: string | null;
  createdAt: string;
  updatedAt: string;
  /** 作业照片（详情接口返回，列表接口不含） */
  workPhotos?: WorkPhotoDto[];
}

export interface CleaningOrderDetailDto extends CleaningOrderDto {
  progress: ProgressNodeDto[];
}

/** 废品订单（API 出参，v2.0：proxyName→serviceContactName，proxyPhone→serviceContactPhone） */
export interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  residentId: number | null;
  workerId?: number | null;
  /** 服务人员信息；详情含 gender，列表仅 id/name/phone */
  worker?: {
    id: number;
    name: string;
    phone: string;
    gender?: string | null;
    rating?: number;
    totalOrders?: number;
  } | null;
  serviceItem: string;
  estimatedWeight: number;
  appointDate: string;
  appointTimeSlot: string;
  addressSnapshot: AddressSnapshot;
  contactName: string;
  contactPhone: string;
  remark?: string | null;
  source: OrderSource;
  isProxyOrder: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  status: OrderStatus;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsCheckinAt?: string | null;
  gpsDistance?: number | null;
  gpsRemark?: string | null;
  createdAt: string;
  updatedAt: string;
  /** 作业照片（详情接口返回，列表接口不含） */
  workPhotos?: WorkPhotoDto[];
}

export interface RecyclingOrderDetailDto extends RecyclingOrderDto {
  progress: ProgressNodeDto[];
}

/** 家政咨询单（API 出参，v2.0：新增代下单 / 服务地址 / 来源字段） */
export interface ConsultOrderDto {
  id: number;
  orderNo: string;
  residentId?: number | null;
  serviceType: string;
  contactName: string;
  contactPhone: string;
  requirementDesc: string;
  isProxyOrder: boolean;
  serviceContactName?: string | null;
  serviceContactPhone?: string | null;
  serviceAddress?: string | null;
  source?: OrderSource | null;
  remark?: string | null;
  status: ConsultStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultOrderDetailDto extends ConsultOrderDto {
  progress: ProgressNodeDto[];
}

/** 家政咨询跟进记录（API 出参，v2.0） */
export interface ConsultFollowUpDto {
  id: number;
  consultId: number;
  handlerName: string;
  content: string;
  createdAt: string;
}
