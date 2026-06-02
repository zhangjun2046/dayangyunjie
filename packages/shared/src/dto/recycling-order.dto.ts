import type { RecyclingItemType } from '../constants';
import type { OrderSource } from '../enums';

/** 居民端创建废品订单 */
export interface CreateRecyclingOrderDto {
  itemType: RecyclingItemType;
  estimatedWeight?: number;
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

/** 管理后台创建废品订单 */
export interface AdminCreateRecyclingOrderDto extends CreateRecyclingOrderDto {
  residentId?: number;
  source: OrderSource;
}

/** 录入实际重量 */
export interface SetActualWeightDto {
  actualWeight: number;
  finalAmount?: string;
}

/** 废品订单列表筛选 */
export interface RecyclingOrderQueryDto {
  status?: string;
  appointDateFrom?: string;
  appointDateTo?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
