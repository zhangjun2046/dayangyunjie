import type {
  ServiceCatalogBizType,
  ServiceCatalogDto,
} from '@/api/service-catalog';
import type { AssignedOrderItem, WorkerOrderItem } from '@/api/order';

export type WorkerOrderCardItem = AssignedOrderItem | WorkerOrderItem;

const DEFAULT_ICONS: Record<WorkerOrderCardItem['orderType'], string> = {
  cleaning: '/static/icons/cleaning.png',
  recycling: '/static/icons/recycling.png',
};

const IMAGE_SOURCE_PATTERN = /^(?:https?:\/\/|\/\/|\/|data:image\/|blob:|wxfile:\/\/)/i;

/** 将员工端订单类型转换为服务目录业务类型。 */
function resolveCatalogBizType(orderType: WorkerOrderCardItem['orderType']): ServiceCatalogBizType {
  return orderType === 'cleaning' ? 'CLEANING' : 'RECYCLING';
}

/** 查找订单对应的二级服务 icon 配置并清理首尾空白。 */
function findConfiguredIcon(
  item: WorkerOrderCardItem,
  catalogs: ServiceCatalogDto[],
): string | null {
  const bizType = resolveCatalogBizType(item.orderType);
  const icon = catalogs
    .find((candidate) => candidate.bizType === bizType && candidate.name === item.serviceName)
    ?.icon?.trim();
  return icon || null;
}

/** 判断配置值是否可作为 image 组件的图片地址。 */
function isImageSource(icon: string): boolean {
  return IMAGE_SOURCE_PATTERN.test(icon);
}

/**
 * 根据订单业务大类和二级服务名称解析后台配置图标。
 * 仅图片地址可用；Emoji 或其它非图片值回退到一级大类本地图标。
 */
export function resolveOrderServiceIcon(
  item: WorkerOrderCardItem,
  catalogs: ServiceCatalogDto[],
  failedRemoteIcons: ReadonlySet<string>,
): string {
  const configuredIcon = findConfiguredIcon(item, catalogs);

  if (
    configuredIcon
    && isImageSource(configuredIcon)
    && !failedRemoteIcons.has(configuredIcon)
  ) {
    return configuredIcon;
  }
  return DEFAULT_ICONS[item.orderType];
}

/** 获取当前订单配置的图片地址，用于图片加载失败后的降级处理。 */
export function resolveOrderRemoteIcon(
  item: WorkerOrderCardItem,
  catalogs: ServiceCatalogDto[],
): string | null {
  const configuredIcon = findConfiguredIcon(item, catalogs);
  return configuredIcon && isImageSource(configuredIcon) ? configuredIcon : null;
}
