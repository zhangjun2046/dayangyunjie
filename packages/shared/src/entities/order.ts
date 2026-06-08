import type { AddressSnapshot } from '../types/address';
import type { ConsultStatus, OrderSource, OrderStatus, PaymentStatus } from '../enums';

/** 保洁订单（API 出参） */
export interface CleaningOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  workerId?: number | null;
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
  proxyName?: string | null;
  proxyPhone?: string | null;
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
}

/** 废品订单（API 出参，P2.6a：无价格/支付/实际重量字段） */
export interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  workerId?: number | null;
  /** 物品大类，如 大件类 / 小件类（前端展示用） */
  serviceItem: string;
  /** 预估重量（kg），供员工确认搬运工具 */
  estimatedWeight: number;
  appointDate: string;
  appointTimeSlot: string;
  addressSnapshot: AddressSnapshot;
  contactName: string;
  contactPhone: string;
  remark?: string | null;
  source: OrderSource;
  isProxyOrder: boolean;
  proxyName?: string | null;
  proxyPhone?: string | null;
  status: OrderStatus;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsCheckinAt?: string | null;
  gpsDistance?: number | null;
  gpsRemark?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 家政咨询单（API 出参） */
export interface ConsultOrderDto {
  id: number;
  orderNo: string;
  residentId?: number | null;
  serviceType: string;
  name: string;
  phone: string;
  description: string;
  status: ConsultStatus;
  createdAt: string;
  updatedAt: string;
}
