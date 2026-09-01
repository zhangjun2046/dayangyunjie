import { describe, expect, it } from 'vitest';
import {
  formatRecyclingCarryFloorText,
  formatRecyclingElevatorText,
  formatRecyclingItemNames,
} from '@dayangyunjie/shared';

describe('recycling order display', () => {
  it('回收物品按选中顺序用顿号拼接名称，不含价格和数量', () => {
    expect(
      formatRecyclingItemNames([
        { itemId: 1, name: '纸张', priceText: '0.6元/kg', quantity: 1 },
        { itemId: 2, name: '金属', priceText: '1元/kg', quantity: 3 },
      ]),
    ).toBe('纸张、金属');
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
