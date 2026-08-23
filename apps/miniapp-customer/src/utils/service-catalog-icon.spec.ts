import { describe, expect, it } from 'vitest';
import type { ServiceCatalogDto } from '@/api/service-catalog';
import {
  resolveServiceCatalogIcon,
  serviceCatalogFallbackEmoji,
  type ServiceCatalogBizType,
} from './service-catalog-icon';

function makeCatalog(
  name: string,
  icon: string | null = null,
  bizType = 'CLEANING',
): ServiceCatalogDto {
  return {
    id: 1,
    bizType,
    name,
    subtitle: '',
    icon,
    sortOrder: 0,
    isEnabled: true,
  };
}

describe('service catalog icon utilities — full matrix', () => {
  describe('远程 icon 优先', () => {
    it('优先返回后台配置的远程图标并 trim', () => {
      const item = makeCatalog('日常清扫', ' https://cdn.example.com/daily.webp ');
      expect(resolveServiceCatalogIcon(item, 'CLEANING')).toBe(
        'https://cdn.example.com/daily.webp',
      );
    });

    it('空字符串 / 空白 icon 视为未配置', () => {
      expect(resolveServiceCatalogIcon(makeCatalog('日常清扫', ''), 'CLEANING')).toBe(
        '/static/icons/daily-cleaning.png',
      );
      expect(resolveServiceCatalogIcon(makeCatalog('日常清扫', '   '), 'CLEANING')).toBe(
        '/static/icons/daily-cleaning.png',
      );
      expect(resolveServiceCatalogIcon(makeCatalog('日常清扫', null), 'CLEANING')).toBe(
        '/static/icons/daily-cleaning.png',
      );
    });

    it('远程失败后即使仍有 icon 字段也回退本地图', () => {
      const item = makeCatalog('保姆', 'https://cdn.example.com/missing.webp');
      expect(resolveServiceCatalogIcon(item, 'CONSULT', true)).toBe(
        '/static/icons/icon_baomu_n.png',
      );
    });
  });

  describe('保洁本地映射', () => {
    it.each([
      ['日常清扫', '/static/icons/daily-cleaning.png'],
      ['深度清扫', '/static/icons/deep-cleaning.png'],
      ['专项清洁', '/static/icons/special-cleaning.png'],
    ] as const)('%s → %s', (name, expected) => {
      expect(resolveServiceCatalogIcon(makeCatalog(name), 'CLEANING')).toBe(expected);
    });
  });

  describe('回收本地映射', () => {
    it.each([
      ['大件类废品', '/static/icons/icon_dajian_n.png'],
      ['小件类废品', '/static/icons/icon_xiaojian_n.png'],
    ] as const)('%s → %s', (name, expected) => {
      expect(resolveServiceCatalogIcon(makeCatalog(name), 'RECYCLING')).toBe(expected);
    });
  });

  describe('家政本地映射', () => {
    it.each([
      ['保姆', '/static/icons/icon_baomu_n.png'],
      ['月嫂', '/static/icons/icon_yuesao_n.png'],
      ['育儿嫂', '/static/icons/icon_yuersao_n.png'],
      ['陪诊', '/static/icons/icon_peizhen_n.png'],
      ['代买菜', '/static/icons/icon_daimaicai_n.png'],
    ] as const)('%s → %s', (name, expected) => {
      expect(resolveServiceCatalogIcon(makeCatalog(name), 'CONSULT')).toBe(expected);
    });
  });

  describe('emoji 兜底', () => {
    it.each([
      ['CLEANING', '玻璃清洁', '🧹'],
      ['RECYCLING', '未知品类', '♻️'],
      ['CONSULT', '保姆', '👩'],
      ['CONSULT', '月嫂', '👶'],
      ['CONSULT', '育儿嫂', '👶'],
      ['CONSULT', '陪诊', '🏥'],
      ['CONSULT', '代买菜', '🛒'],
      ['CONSULT', '老人陪护', '👴'],
      ['CONSULT', '家电维修', '🔧'],
      ['CONSULT', '搬家', '📦'],
      ['CONSULT', '其他服务', '🏠'],
    ] as const)('%s / %s → %s', (bizType, name, emoji) => {
      expect(
        serviceCatalogFallbackEmoji(makeCatalog(name), bizType as ServiceCatalogBizType),
      ).toBe(emoji);
    });

    it('未知服务无本地图时返回 null，由 emoji 兜底', () => {
      expect(resolveServiceCatalogIcon(makeCatalog('玻璃清洁'), 'CLEANING')).toBeNull();
      expect(resolveServiceCatalogIcon(makeCatalog('危险废品'), 'RECYCLING')).toBeNull();
      expect(resolveServiceCatalogIcon(makeCatalog('老人陪护'), 'CONSULT')).toBeNull();
    });
  });

  describe('业务隔离', () => {
    it('保洁名称不会误匹配回收图标', () => {
      expect(resolveServiceCatalogIcon(makeCatalog('大件清扫'), 'CLEANING')).toBeNull();
    });

    it('远程失败且无本地映射时返回 null', () => {
      const item = makeCatalog('未知服务', 'https://cdn.example.com/x.webp');
      expect(resolveServiceCatalogIcon(item, 'CLEANING', true)).toBeNull();
      expect(serviceCatalogFallbackEmoji(item, 'CLEANING')).toBe('🧹');
    });
  });
});
