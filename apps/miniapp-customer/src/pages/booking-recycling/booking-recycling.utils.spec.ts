import { describe, expect, it } from 'vitest';
import {
  CARRY_FLOOR_OPTIONS,
  changeSelectedQuantity,
  getRecyclingStep2BlockMessage,
  isLargeCatalogName,
  isSmallCatalogName,
  itemNameInitial,
  retainAvailableSelectedItems,
  toggleSelectedItem,
} from './booking-recycling.utils';

const paper = { id: 8, name: '纸张', priceText: '0.6元/kg' };
const metal = { id: 9, name: '金属', priceText: '1元/kg' };

describe('booking-recycling Step2 选品工具', () => {
  it('按目录名称判断大件 / 小件', () => {
    expect(isLargeCatalogName('大件类废品')).toBe(true);
    expect(isSmallCatalogName('小件类废品')).toBe(true);
    expect(isLargeCatalogName('小件类废品')).toBe(false);
  });

  it('图标失败时用名称首字', () => {
    expect(itemNameInitial('纸张')).toBe('纸');
    expect(itemNameInitial('  ')).toBe('品');
  });

  it('多选切换，选中顺序保留，默认数量 1', () => {
    const once = toggleSelectedItem([], paper);
    const twice = toggleSelectedItem(once, metal);
    expect(twice).toEqual([
      { itemId: 8, name: '纸张', priceText: '0.6元/kg', quantity: 1 },
      { itemId: 9, name: '金属', priceText: '1元/kg', quantity: 1 },
    ]);
    expect(toggleSelectedItem(twice, paper)).toEqual([
      { itemId: 9, name: '金属', priceText: '1元/kg', quantity: 1 },
    ]);
  });

  it('大件数量加到 99，减到 0 则取消选中', () => {
    const selected = toggleSelectedItem([], paper);
    const plus = changeSelectedQuantity(selected, 8, 1);
    expect(plus[0].quantity).toBe(2);
    const capped = changeSelectedQuantity([{ ...selected[0], quantity: 99 }], 8, 1);
    expect(capped[0].quantity).toBe(99);
    expect(changeSelectedQuantity(selected, 8, -1)).toEqual([]);
  });

  it('启用品项刷新后丢掉已停用的选中项', () => {
    const current = [
      { itemId: 8, name: '纸张', priceText: '0.6元/kg', quantity: 1 },
      { itemId: 9, name: '金属', priceText: '1元/kg', quantity: 1 },
    ];
    expect(retainAvailableSelectedItems(current, [8])).toEqual([current[0]]);
  });

  it('nextStep 一次只报一条：物品 → 电梯 → 大件楼层', () => {
    expect(
      getRecyclingStep2BlockMessage({
        selectedCount: 0,
        hasElevator: null,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择回收物品');
    expect(
      getRecyclingStep2BlockMessage({
        selectedCount: 1,
        hasElevator: null,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择是否有电梯');
    expect(
      getRecyclingStep2BlockMessage({
        selectedCount: 1,
        hasElevator: false,
        carryFloor: null,
        isLarge: true,
      }),
    ).toBe('请选择搬运楼层');
    expect(
      getRecyclingStep2BlockMessage({
        selectedCount: 1,
        hasElevator: true,
        carryFloor: null,
        isLarge: false,
      }),
    ).toBeNull();
    expect(
      getRecyclingStep2BlockMessage({
        selectedCount: 1,
        hasElevator: true,
        carryFloor: 6,
        isLarge: true,
      }),
    ).toBeNull();
  });

  it('楼层选项为 1～30 层', () => {
    expect(CARRY_FLOOR_OPTIONS[0]).toBe('1层');
    expect(CARRY_FLOOR_OPTIONS).toHaveLength(30);
    expect(CARRY_FLOOR_OPTIONS[29]).toBe('30层');
  });
});
