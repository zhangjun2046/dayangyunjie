import {
  buildCreateIconPayload,
  buildUpdateIconPayload,
} from '../services/service-icon.utils';

export const NO_RECYCLING_CATALOG_MESSAGE = '请先在服务配置中新增废品回收分类';
export const PRICE_TEXT_HINT = '仅用于展示，不参与计价';
export const BIZ_TYPE_FIXED_LABEL = '废品回收';

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

export function buildCreateRecyclingItemBody(form: RecyclingItemFormState) {
  return {
    catalogId: form.catalogId as number,
    name: form.name,
    priceText: form.priceText,
    icon: buildCreateIconPayload(form.icon),
    sortOrder: form.sortOrder,
  };
}

export function buildUpdateRecyclingItemBody(form: RecyclingItemFormState) {
  return {
    catalogId: form.catalogId as number,
    name: form.name,
    priceText: form.priceText,
    icon: buildUpdateIconPayload(form.icon),
    sortOrder: form.sortOrder,
  };
}
