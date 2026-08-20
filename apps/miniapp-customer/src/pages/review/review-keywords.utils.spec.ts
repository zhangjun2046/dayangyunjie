import { describe, expect, it } from 'vitest';
import type { ReviewKeywordDto } from '@dayangyunjie/shared';
import {
  mapReviewKeywordsToTags,
  normalizeReviewOrderType,
  retainAvailableSelectedTags,
} from './review-keywords.utils';

const makeKeyword = (id: number, keyword: string): ReviewKeywordDto => ({
  id,
  bizType: 'CLEANING',
  keyword,
  sortOrder: id,
  isEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('customer review keyword utilities', () => {
  it('保持接口排序并提取关键词文本', () => {
    const rows = [makeKeyword(2, '态度好'), makeKeyword(1, '准时到达')];
    expect(mapReviewKeywordsToTags(rows)).toEqual(['态度好', '准时到达']);
  });

  it('配置重载后移除已停用或删除的选中标签', () => {
    expect(
      retainAvailableSelectedTags(['准时到达', '旧关键词', '态度好'], ['准时到达', '态度好']),
    ).toEqual(['准时到达', '态度好']);
  });

  it('空列表会清空已选标签', () => {
    expect(retainAvailableSelectedTags(['准时到达'], [])).toEqual([]);
  });

  it.each([
    ['RECYCLING', 'RECYCLING'],
    ['recycling', 'RECYCLING'],
    ['CLEANING', 'CLEANING'],
    ['invalid', 'CLEANING'],
    [undefined, 'CLEANING'],
  ] as const)('将订单类型 %s 归一化为 %s', (input, expected) => {
    expect(normalizeReviewOrderType(input)).toBe(expected);
  });
});
