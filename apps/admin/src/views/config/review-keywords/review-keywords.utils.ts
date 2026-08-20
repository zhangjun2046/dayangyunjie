import type { ReviewKeywordBizType } from '@dayangyunjie/shared';

/** 管理端业务类型显示名称 */
export function reviewKeywordBizTypeLabel(type: ReviewKeywordBizType): string {
  return type === 'CLEANING' ? '保洁服务' : '废品回收';
}

/** 评价关键词时间显示格式 */
export function formatReviewKeywordDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

/** 删除当前页最后一条数据时是否需要回退页码 */
export function shouldGoToPreviousPage(rowCount: number, currentPage: number): boolean {
  return rowCount === 1 && currentPage > 1;
}
