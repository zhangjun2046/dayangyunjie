import { describe, expect, it } from 'vitest';
import {
  isLargeRecyclingCatalog,
  MAX_PRICE_POSTER_FILE_SIZE,
  validatePricePosterFile,
} from './service-price-poster.utils';

describe('service price poster utils', () => {
  it('仅废品回收大件显示价格海报', () => {
    expect(isLargeRecyclingCatalog('RECYCLING', '大件类')).toBe(true);
    expect(isLargeRecyclingCatalog('RECYCLING', '小件类')).toBe(false);
    expect(isLargeRecyclingCatalog('CLEANING', '大件清扫')).toBe(false);
  });

  it('拒绝超过 10MB 的海报', () => {
    expect(
      validatePricePosterFile({
        type: 'image/jpeg',
        size: MAX_PRICE_POSTER_FILE_SIZE + 1,
      }),
    ).toEqual({
      ok: false,
      message: '价格海报大小不能超过 10MB',
    });
  });
});
