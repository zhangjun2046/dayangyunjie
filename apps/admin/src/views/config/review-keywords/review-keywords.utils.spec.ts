import { describe, expect, it } from 'vitest';
import {
  formatReviewKeywordDate,
  reviewKeywordBizTypeLabel,
  shouldGoToPreviousPage,
} from './review-keywords.utils';

describe('review keyword page utilities', () => {
  it.each([
    ['CLEANING', '保洁服务'],
    ['RECYCLING', '废品回收'],
  ] as const)('将 %s 显示为 %s', (type, label) => {
    expect(reviewKeywordBizTypeLabel(type)).toBe(label);
  });

  it('使用 24 小时制格式化时间', () => {
    const result = formatReviewKeywordDate('2026-08-20T07:30:00.000Z');
    expect(result).not.toMatch(/AM|PM/i);
    expect(result).toContain('2026');
  });

  it.each([
    [1, 2, true],
    [1, 1, false],
    [2, 2, false],
  ])('rowCount=%s currentPage=%s => %s', (rowCount, currentPage, expected) => {
    expect(shouldGoToPreviousPage(rowCount, currentPage)).toBe(expected);
  });
});
