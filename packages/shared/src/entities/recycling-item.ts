/** 废品回收品项（API 出参；金额为展示文案，不算价） */
export interface RecyclingItemDto {
  id: number;
  catalogId: number;
  catalogName: string;
  name: string;
  priceText: string;
  icon: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
