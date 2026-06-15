import type { AddressSnapshot } from '../types/address';
import type { ConsultStatus, OrderSource, OrderStatus, PaymentStatus } from '../enums';

/** 保洁订单（API 出参，v2.0：proxyName→serviceContactName，proxyPhone→serviceContactPhone） */
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
}

/** 废品订单（API 出参，v2.0：proxyName→serviceContactName，proxyPhone→serviceContactPhone） */
export interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  residentId: number;
  workerId?: number | null;
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
}

/** 家政咨询单（API 出参，v2.0：name→contactName, phone→contactPhone, description→requirementDesc） */
export interface ConsultOrderDto {
  id: number;
  orderNo: string;
  residentId?: number | null;
  serviceType: string;
  contactName: string;
  contactPhone: string;
  requirementDesc: string;
  status: ConsultStatus;
  createdAt: string;
  updatedAt: string;
}
