import type { OrderSource } from '../enums';
import type { RecyclingOrderSelectedItem } from '../entities/order';

/** 居民端创建废品订单（P2.6a 确认版） */
export interface CreateRecyclingOrderDto {
  residentId: number;
  /** 物品大类（大件类 / 小件类） */
  serviceItem: string;
  /** 预估重量（kg），供员工确认搬运工具 */
  estimatedWeight: number;
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
  /** 选中的回收品项；B 步旧代下单可不传 */
  selectedItems?: RecyclingOrderSelectedItem[];
  hasElevator?: boolean;
  carryFloor?: number;
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
