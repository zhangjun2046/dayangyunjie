import type { ServiceCatalogDto } from '@/api/service-catalog';

export type ServiceCatalogBizType = 'CLEANING' | 'RECYCLING' | 'CONSULT';

/**
 * 解析服务类型图片地址。
 * 后台图标优先；未配置或远程图片加载失败时，兼容现有按名称匹配的本地图标。
 */
export function resolveServiceCatalogIcon(
  item: ServiceCatalogDto,
  bizType: ServiceCatalogBizType,
  remoteIconFailed = false,
): string | null {
  const remoteIcon = item.icon?.trim();
  if (remoteIcon && !remoteIconFailed) return remoteIcon;

  if (bizType === 'CLEANING') {
    if (item.name?.includes('日常')) return '/static/icons/daily-cleaning.png';
    if (item.name?.includes('深度')) return '/static/icons/deep-cleaning.png';
    if (item.name?.includes('专项')) return '/static/icons/special-cleaning.png';
  }

  if (bizType === 'RECYCLING') {
    if (item.name?.includes('大件')) return '/static/icons/icon_dajian_n.png';
    if (item.name?.includes('小件')) return '/static/icons/icon_xiaojian_n.png';
  }

  if (bizType === 'CONSULT') {
    if (item.name?.includes('保姆')) return '/static/icons/icon_baomu_n.png';
    if (item.name?.includes('月嫂')) return '/static/icons/icon_yuesao_n.png';
    if (item.name?.includes('育儿嫂')) return '/static/icons/icon_yuersao_n.png';
    if (item.name?.includes('陪诊')) return '/static/icons/icon_peizhen_n.png';
    if (item.name?.includes('买菜')) return '/static/icons/icon_daimaicai_n.png';
  }

  return null;
}

/** 服务类型没有可用图片时显示的 emoji。 */
export function serviceCatalogFallbackEmoji(
  item: ServiceCatalogDto,
  bizType: ServiceCatalogBizType,
): string {
  if (bizType === 'CLEANING') return '🧹';
  if (bizType === 'RECYCLING') return '♻️';

  const consultIconMap: Record<string, string> = {
    保姆: '👩',
    月嫂: '👶',
    育儿嫂: '👶',
    陪诊: '🏥',
    代买菜: '🛒',
    老人陪护: '👴',
    家电维修: '🔧',
    搬家: '📦',
  };
  return consultIconMap[item.name] ?? '🏠';
}
