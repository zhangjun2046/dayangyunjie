/** 可配置评价关键词支持的订单业务类型 */
export type ReviewKeywordBizType = 'CLEANING' | 'RECYCLING';

/** 评价关键词配置 API 出参 */
export interface ReviewKeywordDto {
  id: number;
  bizType: ReviewKeywordBizType;
  keyword: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
