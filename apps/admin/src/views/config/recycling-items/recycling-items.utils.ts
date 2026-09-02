import {
  buildCreateIconPayload,
  buildUpdateIconPayload,
} from '../services/service-icon.utils';

export const NO_RECYCLING_CATALOG_MESSAGE = '请先在服务配置中新增废品回收分类';
export const PRICE_TEXT_HINT = '仅用于展示，不参与计价';
export const BIZ_TYPE_FIXED_LABEL = '废品回收';
export const LARGE_ITEM_DEFAULT_PRICE_TEXT = '面议';

export interface RecyclingItemFormState {
  catalogId: number | undefined;
  name: string;
  priceText: string;
  icon: string;
  sortOrder: number;
}

export function getNoRecyclingCatalogMessage(catalogCount: number): string | null {
  return catalogCount === 0 ? NO_RECYCLING_CATALOG_MESSAGE : null;
}

export function isLargeRecyclingCatalogName(name?: string | null): boolean {
  return Boolean(name?.includes('大件'));
}

export function isSmallRecyclingCatalogName(name?: string | null): boolean {
  return Boolean(name?.includes('小件'));
}

export function buildCreateRecyclingItemBody(
  form: RecyclingItemFormState,
  catalogName?: string | null,
) {
  if (isLargeRecyclingCatalogName(catalogName)) {
    return {
      catalogId: form.catalogId as number,
      name: form.name,
      priceText: LARGE_ITEM_DEFAULT_PRICE_TEXT,
      sortOrder: form.sortOrder,
    };
  }
  return {
    catalogId: form.catalogId as number,
    name: form.name,
    priceText: form.priceText,
    icon: buildCreateIconPayload(form.icon),
    sortOrder: form.sortOrder,
  };
}

export function buildUpdateRecyclingItemBody(
  form: RecyclingItemFormState,
  catalogName?: string | null,
) {
  if (isLargeRecyclingCatalogName(catalogName)) {
    return {
      catalogId: form.catalogId as number,
      name: form.name,
      priceText: LARGE_ITEM_DEFAULT_PRICE_TEXT,
      icon: null,
      sortOrder: form.sortOrder,
    };
  }
  return {
    catalogId: form.catalogId as number,
    name: form.name,
    priceText: form.priceText,
    icon: buildUpdateIconPayload(form.icon),
    sortOrder: form.sortOrder,
  };
}
