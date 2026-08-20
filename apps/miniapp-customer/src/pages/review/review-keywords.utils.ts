import type { ReviewKeywordDto } from '@dayangyunjie/shared';

/** 将后端配置转换为评价页展示标签 */
export function mapReviewKeywordsToTags(rows: ReviewKeywordDto[]): string[] {
  return rows.map((row) => row.keyword);
}

/** 配置重新加载后，仅保留仍然可用的已选标签 */
export function retainAvailableSelectedTags(selected: string[], available: string[]): string[] {
  return selected.filter((tag) => available.includes(tag));
}

/** 将页面参数归一化为后端支持的评价业务类型 */
export function normalizeReviewOrderType(value?: string): 'CLEANING' | 'RECYCLING' {
  return value?.toUpperCase() === 'RECYCLING' ? 'RECYCLING' : 'CLEANING';
}
