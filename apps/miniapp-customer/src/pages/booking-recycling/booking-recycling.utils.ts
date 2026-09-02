export interface BookingSelectedItem {
  itemId: number;
  name: string;
  priceText: string;
  quantity: number;
}

export const CARRY_FLOOR_OPTIONS = Array.from({ length: 30 }, (_, index) => `${index + 1}层`);

export function isLargeCatalogName(name?: string | null): boolean {
  return Boolean(name?.includes('大件'));
}

export function isSmallCatalogName(name?: string | null): boolean {
  return Boolean(name?.includes('小件'));
}

export function itemNameInitial(name: string): string {
  return name.trim().slice(0, 1) || '品';
}

export function toggleSelectedItem(
  current: BookingSelectedItem[],
  item: { id: number; name: string; priceText: string },
): BookingSelectedItem[] {
  if (current.some((row) => row.itemId === item.id)) {
    return current.filter((row) => row.itemId !== item.id);
  }
  return [
    ...current,
    { itemId: item.id, name: item.name, priceText: item.priceText, quantity: 1 },
  ];
}

export function changeSelectedQuantity(
  current: BookingSelectedItem[],
  itemId: number,
  delta: number,
): BookingSelectedItem[] {
  return current.flatMap((row) => {
    if (row.itemId !== itemId) return [row];
    const next = row.quantity + delta;
    if (next <= 0) return [];
    return [{ ...row, quantity: Math.min(99, next) }];
  });
}

export function retainAvailableSelectedItems(
  current: BookingSelectedItem[],
  enabledIds: number[],
): BookingSelectedItem[] {
  const idSet = new Set(enabledIds);
  return current.filter((row) => idSet.has(row.itemId));
}

export function getRecyclingStep2BlockMessage(input: {
  selectedCount: number;
  hasElevator: boolean | null;
  carryFloor: number | null;
}): string | null {
  if (input.selectedCount < 1) return '请选择回收物品';
  if (input.hasElevator !== true && input.hasElevator !== false) return '请选择是否有电梯';
  if (input.carryFloor == null || input.carryFloor < 1) {
    return '请选择搬运楼层';
  }
  return null;
}
