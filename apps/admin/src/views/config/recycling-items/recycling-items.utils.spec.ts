import { describe, expect, it } from 'vitest';
import {
  BIZ_TYPE_FIXED_LABEL,
  LARGE_ITEM_DEFAULT_PRICE_TEXT,
  NO_RECYCLING_CATALOG_MESSAGE,
  PRICE_TEXT_HINT,
  buildCreateRecyclingItemBody,
  buildUpdateRecyclingItemBody,
  getNoRecyclingCatalogMessage,
  isLargeRecyclingCatalogName,
  isSmallRecyclingCatalogName,
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

  it('按分类名称判断大件 / 小件', () => {
    expect(isLargeRecyclingCatalogName('大件类')).toBe(true);
    expect(isSmallRecyclingCatalogName('小件类')).toBe(true);
    expect(isLargeRecyclingCatalogName('小件类')).toBe(false);
  });

  it('大件新增不传图标，金额写入面议', () => {
    expect(buildCreateRecyclingItemBody({ ...form, name: '单门柜' }, '大件类')).toEqual({
      catalogId: 4,
      name: '单门柜',
      priceText: LARGE_ITEM_DEFAULT_PRICE_TEXT,
      sortOrder: 1,
    });
  });

  it('大件编辑清除图标', () => {
    expect(buildUpdateRecyclingItemBody({ ...form, name: '单门柜' }, '大件类')).toEqual({
      catalogId: 4,
      name: '单门柜',
      priceText: LARGE_ITEM_DEFAULT_PRICE_TEXT,
      icon: null,
      sortOrder: 1,
    });
  });
});
