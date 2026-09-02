import type { BizType } from '../constants';

/** 服务目录（API 出参，v2.0：去价格字段，新增 name/subtitle/icon/isEnabled） */
export interface ServiceCatalogDto {
  id: number;
  bizType: BizType;
  name: string;
  subtitle?: string | null;
  icon?: string | null;
  /** 大件价格表整图；非大件为 null */
  priceImageUrl?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
