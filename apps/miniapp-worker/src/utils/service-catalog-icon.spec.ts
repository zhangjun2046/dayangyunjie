import { describe, expect, it } from 'vitest';
import type { ServiceCatalogDto } from '@/api/service-catalog';
import type { WorkerOrderItem } from '@/api/order';
import {
  resolveOrderRemoteIcon,
  resolveOrderServiceIcon,
} from './service-catalog-icon';

const CLEANING_FALLBACK = '/static/icons/cleaning.png';
const RECYCLING_FALLBACK = '/static/icons/recycling.png';

function makeOrder(
  orderType: WorkerOrderItem['orderType'],
  serviceName: string,
): WorkerOrderItem {
  return {
    id: 1,
    orderNo: 'ORDER-001',
    orderType,
    serviceName,
    appointDate: '2026.08.20',
    appointTimeSlot: '09:00',
    address: '北京市朝阳区',
    status: 'ASSIGNED',
  };
}

function makeCatalog(
  bizType: string,
  name: string,
  icon: string | null,
  isEnabled = true,
): ServiceCatalogDto {
  return {
    id: 1,
    bizType,
    name,
    icon,
    isEnabled,
  };
}

describe('worker service catalog icon utilities — full matrix', () => {
  describe('后台二级服务 icon 优先', () => {
    it.each([
      ['cleaning', 'CLEANING', '专项保洁', 'https://cdn.example.com/special.webp'],
      ['recycling', 'RECYCLING', '超大件回收', 'https://cdn.example.com/large.webp'],
    ] as const)('%s 订单返回对应二级服务 icon', (orderType, bizType, name, icon) => {
      const order = makeOrder(orderType, name);
      const catalogs = [makeCatalog(bizType, name, icon)];

      expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(icon);
      expect(resolveOrderRemoteIcon(order, catalogs)).toBe(icon);
    });

    it('清理后台 icon 首尾空白后返回', () => {
      const order = makeOrder('cleaning', '日常保洁');
      const catalogs = [
        makeCatalog('CLEANING', '日常保洁', '  https://cdn.example.com/daily.webp  '),
      ];

      expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(
        'https://cdn.example.com/daily.webp',
      );
      expect(resolveOrderRemoteIcon(order, catalogs)).toBe(
        'https://cdn.example.com/daily.webp',
      );
    });

    it('停用的服务目录仍可供历史订单匹配', () => {
      const order = makeOrder('recycling', '旧版回收');
      const catalogs = [
        makeCatalog('RECYCLING', '旧版回收', 'https://cdn.example.com/legacy.webp', false),
      ];

      expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(
        'https://cdn.example.com/legacy.webp',
      );
    });
  });

  describe('Emoji 或非图片 icon 回退本地大类图', () => {
    it.each([
      ['cleaning', 'CLEANING', '日常保洁', '🧹', CLEANING_FALLBACK],
      ['cleaning', 'CLEANING', '深度保洁', '🧽', CLEANING_FALLBACK],
      ['cleaning', 'CLEANING', '专项保洁', '💧', CLEANING_FALLBACK],
      ['recycling', 'RECYCLING', '大件类废品', '🚚', RECYCLING_FALLBACK],
      ['recycling', 'RECYCLING', '小件类废品', '📦', RECYCLING_FALLBACK],
    ] as const)(
      '%s / %s 配置 Emoji 时回退本地图',
      (orderType, bizType, name, emoji, imageFallback) => {
        const order = makeOrder(orderType, name);
        const catalogs = [makeCatalog(bizType, name, ` ${emoji} `)];

        expect(resolveOrderRemoteIcon(order, catalogs)).toBeNull();
        expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(imageFallback);
      },
    );

    it('Emoji 不会被图片失败集合误判为远程图片', () => {
      const order = makeOrder('cleaning', '专项保洁');
      const catalogs = [makeCatalog('CLEANING', '专项保洁', '💧')];

      expect(resolveOrderServiceIcon(order, catalogs, new Set(['💧']))).toBe(
        CLEANING_FALLBACK,
      );
      expect(resolveOrderRemoteIcon(order, catalogs)).toBeNull();
    });
  });

  describe('业务大类与服务名称精确匹配', () => {
    it('同名服务按业务大类选择正确 icon', () => {
      const catalogs = [
        makeCatalog('RECYCLING', '通用服务', 'https://cdn.example.com/recycling.webp'),
        makeCatalog('CLEANING', '通用服务', 'https://cdn.example.com/cleaning.webp'),
      ];

      expect(
        resolveOrderServiceIcon(makeOrder('cleaning', '通用服务'), catalogs, new Set()),
      ).toBe('https://cdn.example.com/cleaning.webp');
      expect(
        resolveOrderServiceIcon(makeOrder('recycling', '通用服务'), catalogs, new Set()),
      ).toBe('https://cdn.example.com/recycling.webp');
    });

    it('名称仅部分相同时不误匹配', () => {
      const catalogs = [
        makeCatalog('CLEANING', '专项保洁', 'https://cdn.example.com/special.webp'),
      ];

      expect(
        resolveOrderServiceIcon(makeOrder('cleaning', '专项'), catalogs, new Set()),
      ).toBe(CLEANING_FALLBACK);
      expect(resolveOrderRemoteIcon(makeOrder('cleaning', '专项'), catalogs)).toBeNull();
    });

    it('业务大类不同时不误匹配', () => {
      const order = makeOrder('cleaning', '超大件回收');
      const catalogs = [
        makeCatalog('RECYCLING', '超大件回收', 'https://cdn.example.com/large.webp'),
      ];

      expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(CLEANING_FALLBACK);
      expect(resolveOrderRemoteIcon(order, catalogs)).toBeNull();
    });
  });

  describe('一级大类图标兜底', () => {
    it.each([
      ['cleaning', CLEANING_FALLBACK],
      ['recycling', RECYCLING_FALLBACK],
    ] as const)('%s 订单未匹配目录时回退大类 icon', (orderType, fallback) => {
      const order = makeOrder(orderType, '未配置服务');

      expect(resolveOrderServiceIcon(order, [], new Set())).toBe(fallback);
      expect(resolveOrderRemoteIcon(order, [])).toBeNull();
    });

    it.each([null, '', '   '] as const)('icon 为 %j 时回退保洁大类 icon', (icon) => {
      const order = makeOrder('cleaning', '日常保洁');
      const catalogs = [makeCatalog('CLEANING', '日常保洁', icon)];

      expect(resolveOrderServiceIcon(order, catalogs, new Set())).toBe(CLEANING_FALLBACK);
      expect(resolveOrderRemoteIcon(order, catalogs)).toBeNull();
    });
  });

  describe('远程图片加载失败', () => {
    it('失败集合包含当前远程地址时回退对应大类 icon', () => {
      const remoteIcon = 'https://cdn.example.com/missing.webp';
      const order = makeOrder('recycling', '小件回收');
      const catalogs = [makeCatalog('RECYCLING', '小件回收', remoteIcon)];

      expect(resolveOrderServiceIcon(order, catalogs, new Set([remoteIcon]))).toBe(
        RECYCLING_FALLBACK,
      );
      expect(resolveOrderRemoteIcon(order, catalogs)).toBe(remoteIcon);
    });

    it('其他图片失败不会影响当前订单 icon', () => {
      const remoteIcon = 'https://cdn.example.com/available.webp';
      const order = makeOrder('cleaning', '深度保洁');
      const catalogs = [makeCatalog('CLEANING', '深度保洁', remoteIcon)];

      expect(
        resolveOrderServiceIcon(
          order,
          catalogs,
          new Set(['https://cdn.example.com/other.webp']),
        ),
      ).toBe(remoteIcon);
    });

    it('共享同一失败地址的多个服务均执行兜底', () => {
      const remoteIcon = 'https://cdn.example.com/shared-missing.webp';
      const catalogs = [
        makeCatalog('CLEANING', '日常保洁', remoteIcon),
        makeCatalog('RECYCLING', '小件回收', remoteIcon),
      ];
      const failedIcons = new Set([remoteIcon]);

      expect(
        resolveOrderServiceIcon(makeOrder('cleaning', '日常保洁'), catalogs, failedIcons),
      ).toBe(CLEANING_FALLBACK);
      expect(
        resolveOrderServiceIcon(makeOrder('recycling', '小件回收'), catalogs, failedIcons),
      ).toBe(RECYCLING_FALLBACK);
    });
  });
});
