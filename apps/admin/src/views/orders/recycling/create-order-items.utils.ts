export interface CreateSelectedItem {
  itemId: number;
  name: string;
  priceText: string;
  quantity: number;
}

export const CARRY_FLOOR_VALUES = Array.from({ length: 30 }, (_, index) => index + 1);

export function isLargeCatalogName(name?: string | null): boolean {
  return Boolean(name?.includes('大件'));
}

export function syncSelectedItems(
  current: CreateSelectedItem[],
  selectedIds: number[],
  catalogItems: Array<{ id: number; name: string; priceText: string }>,
): CreateSelectedItem[] {
  const currentById = new Map(current.map((row) => [row.itemId, row]));
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
  const next: CreateSelectedItem[] = [];
  for (const id of selectedIds) {
    const existing = currentById.get(id);
    if (existing) {
      next.push(existing);
      continue;
    }
    const item = catalogById.get(id);
    if (!item) continue;
    next.push({
      itemId: item.id,
      name: item.name,
      priceText: item.priceText,
      quantity: 1,
    });
  }
  return next;
}

export function changeSelectedQuantity(
  current: CreateSelectedItem[],
  itemId: number,
  delta: number,
): CreateSelectedItem[] {
  return current.flatMap((row) => {
    if (row.itemId !== itemId) return [row];
    const next = row.quantity + delta;
    if (next <= 0) return [];
    return [{ ...row, quantity: Math.min(99, next) }];
  });
}

export function getRecyclingCreateBlockMessage(input: {
  selectedCount: number;
  hasElevator: boolean | null;
  carryFloor: number | null;
  isLarge: boolean;
}): string | null {
  if (input.selectedCount < 1) return '请选择回收物品';
  if (input.hasElevator !== true && input.hasElevator !== false) return '请选择是否有电梯';
  if (input.isLarge && (input.carryFloor == null || input.carryFloor < 1)) {
    return '请选择搬运楼层';
  }
  return null;
}
