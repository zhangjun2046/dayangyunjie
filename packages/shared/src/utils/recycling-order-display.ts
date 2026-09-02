import type { RecyclingOrderSelectedItem } from '../entities/order';

export function shouldShowRecyclingItemQuantity(catalogName?: string | null): boolean {
  return Boolean(catalogName?.includes('大件'));
}

/** 确认/详情：顿号拼接名称；大件带 *数量；无快照则不展示 */
export function formatRecyclingItemNames(
  items?: Array<Pick<RecyclingOrderSelectedItem, 'name' | 'quantity'>> | null,
  catalogName?: string | null,
): string | null {
  if (!items?.length) return null;
  const showQuantity = shouldShowRecyclingItemQuantity(catalogName);
  const parts = items
    .map((item) => {
      const name = item.name?.trim();
      if (!name) return null;
      if (!showQuantity) return name;
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      return `${name}*${quantity}`;
    })
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join('、') : null;
}

export function formatRecyclingElevatorText(hasElevator?: boolean | null): string | null {
  if (hasElevator === true) return '有电梯';
  if (hasElevator === false) return '无电梯';
  return null;
}

export function formatRecyclingCarryFloorText(carryFloor?: number | null): string | null {
  if (typeof carryFloor !== 'number' || !Number.isInteger(carryFloor) || carryFloor < 1) {
    return null;
  }
  return `${carryFloor}层`;
}
