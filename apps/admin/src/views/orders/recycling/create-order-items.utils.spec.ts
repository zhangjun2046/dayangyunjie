import { describe, expect, it } from 'vitest';
import {
  CARRY_FLOOR_VALUES,
  changeSelectedQuantity,
  getRecyclingCreateBlockMessage,
  isLargeCatalogName,
  syncSelectedItems,
} from './create-order-items.utils';

const paper = { id: 8, name: '纸张', priceText: '0.6元/kg' };
const metal = { id: 9, name: '金属', priceText: '1元/kg' };
const cabinet = { id: 21, name: '单门柜', priceText: '面议' };

describe('PC 代下单选品', () => {
  it('按目录名称判断大件', () => {
    expect(isLargeCatalogName('大件类废品')).toBe(true);
    expect(isLargeCatalogName('小件类废品')).toBe(false);
  });

  it('多选按勾选顺序保留，默认数量 1', () => {
    const once = syncSelectedItems([], [8], [paper, metal]);
    const twice = syncSelectedItems(once, [8, 9], [paper, metal]);
    expect(twice).toEqual([
      { itemId: 8, name: '纸张', priceText: '0.6元/kg', quantity: 1 },
      { itemId: 9, name: '金属', priceText: '1元/kg', quantity: 1 },
    ]);
    expect(syncSelectedItems(twice, [9], [paper, metal])).toEqual([
      { itemId: 9, name: '金属', priceText: '1元/kg', quantity: 1 },
    ]);
  });

  it('大件数量加到 99，减到 0 则取消选中', () => {
    const selected = syncSelectedItems([], [21], [cabinet]);
    expect(changeSelectedQuantity(selected, 21, 1)[0].quantity).toBe(2);
    expect(
      changeSelectedQuantity([{ ...selected[0], quantity: 99 }], 21, 1)[0].quantity,
    ).toBe(99);
    expect(changeSelectedQuantity(selected, 21, -1)).toEqual([]);
  });

  it('提交一次只报一条：物品 → 电梯 → 大件楼层', () => {
    expect(
      getRecyclingCreateBlockMessage({
        selectedCount: 0,
        hasElevator: null,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择回收物品');
    expect(
      getRecyclingCreateBlockMessage({
        selectedCount: 1,
        hasElevator: null,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择是否有电梯');
    expect(
      getRecyclingCreateBlockMessage({
        selectedCount: 1,
        hasElevator: false,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择搬运楼层');
    expect(
      getRecyclingCreateBlockMessage({
        selectedCount: 1,
        hasElevator: true,
        carryFloor: null,
        isLarge: false,
      }),
    ).toBeNull();
  });

  it('楼层选项为 1～30', () => {
    expect(CARRY_FLOOR_VALUES[0]).toBe(1);
    expect(CARRY_FLOOR_VALUES).toHaveLength(30);
    expect(CARRY_FLOOR_VALUES[29]).toBe(30);
  });
});
