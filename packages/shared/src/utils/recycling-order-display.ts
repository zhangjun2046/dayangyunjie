import type { RecyclingOrderSelectedItem } from '../entities/order';

/** 确认/详情：只拼名称，顿号分隔；无快照则不展示 */
export function formatRecyclingItemNames(
  items?: Array<Pick<RecyclingOrderSelectedItem, 'name'>> | null,
): string | null {
  if (!items?.length) return null;
  const names = items.map((item) => item.name?.trim()).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join('、') : null;
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
