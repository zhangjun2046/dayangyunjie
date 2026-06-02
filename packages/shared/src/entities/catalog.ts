import type { BizType } from '../constants';

/** 服务目录（API 出参） */
export interface ServiceCatalogDto {
  id: number;
  bizType: BizType;
  serviceItem: string;
  priceMin: string;
  priceMax: string;
  priceUnit: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
