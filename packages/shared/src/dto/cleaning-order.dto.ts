import type { OrderSource } from '../enums';

/** 居民端创建保洁订单 */
export interface CreateCleaningOrderDto {
  serviceItem: string;
  serviceDuration?: number;
  appointDate: string;
  appointTimeSlot: string;
  addressId: number;
  contactName: string;
  contactPhone: string;
  remark?: string;
  source?: OrderSource;
  isProxyOrder?: boolean;
  proxyName?: string;
  proxyPhone?: string;
}

/** 管理后台代下单 / 电话预约 */
export interface AdminCreateCleaningOrderDto extends CreateCleaningOrderDto {
  residentId?: number;
  source: OrderSource;
}

/** 派单 */
export interface AssignWorkerDto {
  workerId: number;
}

/** 核定金额 */
export interface SetFinalAmountDto {
  finalAmount: string;
}

/** GPS 签到 */
export interface GpsCheckinDto {
  lat: number;
  lng: number;
  remark?: string;
}

/** 订单列表筛选 */
export interface CleaningOrderQueryDto {
  status?: string;
  appointDateFrom?: string;
  appointDateTo?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
