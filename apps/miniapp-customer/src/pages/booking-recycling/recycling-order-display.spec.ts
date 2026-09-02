import { describe, expect, it } from 'vitest';
import {
  formatRecyclingCarryFloorText,
  formatRecyclingElevatorText,
  formatRecyclingItemNames,
} from '@dayangyunjie/shared';

describe('recycling order display', () => {
  it('小件只拼名称，大件才带数量', () => {
    const items = [
      { itemId: 1, name: '纸张', priceText: '0.6元/kg', quantity: 1 },
      { itemId: 2, name: '金属', priceText: '1元/kg', quantity: 3 },
    ];
    expect(formatRecyclingItemNames(items, '小件类')).toBe('纸张、金属');
    expect(
      formatRecyclingItemNames(
        [
          { itemId: 21, name: '桌子', priceText: '面议', quantity: 1 },
          { itemId: 22, name: '椅子', priceText: '面议', quantity: 2 },
        ],
        '大件类',
      ),
    ).toBe('桌子*1、椅子*2');
  });

  it('旧单无快照或空数组不展示', () => {
    expect(formatRecyclingItemNames(null)).toBeNull();
    expect(formatRecyclingItemNames([])).toBeNull();
  });

  it('电梯文案只区分有 / 无，未选不展示', () => {
    expect(formatRecyclingElevatorText(true)).toBe('有电梯');
    expect(formatRecyclingElevatorText(false)).toBe('无电梯');
    expect(formatRecyclingElevatorText(null)).toBeNull();
  });

  it('楼层展示为 N层，未选不展示', () => {
    expect(formatRecyclingCarryFloorText(6)).toBe('6层');
    expect(formatRecyclingCarryFloorText(null)).toBeNull();
    expect(formatRecyclingCarryFloorText(0)).toBeNull();
  });
});
