import { describe, expect, it } from 'vitest';
import {
  BIZ_TYPE_FIXED_LABEL,
  NO_RECYCLING_CATALOG_MESSAGE,
  PRICE_TEXT_HINT,
  buildCreateRecyclingItemBody,
  buildUpdateRecyclingItemBody,
  getNoRecyclingCatalogMessage,
} from './recycling-items.utils';

const form = {
  catalogId: 4,
  name: '纸张',
  priceText: '0.6元/kg',
  icon: 'https://cdn.example.com/paper.webp',
  sortOrder: 1,
};

describe('recycling-items utils', () => {
  it('无废品分类时返回固定提示', () => {
    expect(getNoRecyclingCatalogMessage(0)).toBe(NO_RECYCLING_CATALOG_MESSAGE);
    expect(getNoRecyclingCatalogMessage(2)).toBeNull();
  });

  it('新增载荷不含所属业务字段，空图标不写入', () => {
    expect(buildCreateRecyclingItemBody(form)).toEqual({
      catalogId: 4,
      name: '纸张',
      priceText: '0.6元/kg',
      icon: 'https://cdn.example.com/paper.webp',
      sortOrder: 1,
    });
    expect(
      Object.keys(buildCreateRecyclingItemBody({ ...form, icon: '' })),
    ).toEqual(['catalogId', 'name', 'priceText', 'icon', 'sortOrder']);
    expect(buildCreateRecyclingItemBody({ ...form, icon: '' }).icon).toBeUndefined();
  });

  it('编辑时空图标转为 null 以清除', () => {
    expect(buildUpdateRecyclingItemBody({ ...form, icon: '' })).toEqual({
      catalogId: 4,
      name: '纸张',
      priceText: '0.6元/kg',
      icon: null,
      sortOrder: 1,
    });
  });

  it('文案口径固定', () => {
    expect(BIZ_TYPE_FIXED_LABEL).toBe('废品回收');
    expect(PRICE_TEXT_HINT).toBe('仅用于展示，不参与计价');
  });
});
