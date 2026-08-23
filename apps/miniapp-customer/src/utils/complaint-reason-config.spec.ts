import { describe, expect, it, vi } from 'vitest';
import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import { ApiRequestError } from '../api/errors';
import {
  COMPLAINT_REASON_CONFIG_CACHE_KEY,
  isUnavailableComplaintReasonError,
  normalizeComplaintReasonConfigs,
  resolveComplaintReasonConfigs,
} from './complaint-reason-config';

function makeConfig(
  id: number,
  label: string,
  sortOrder: number,
  isEnabled = true,
): ComplaintReasonConfigDto {
  return {
    id,
    label,
    sortOrder,
    isEnabled,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createStorage(initial?: unknown, initialKey = COMPLAINT_REASON_CONFIG_CACHE_KEY) {
  let value = initial;
  return {
    getStorageSync: vi.fn((key: string) => (key === initialKey ? value : undefined)),
    setStorageSync: vi.fn((key: string, next: unknown) => {
      initialKey = key;
      value = next;
    }),
  };
}

describe('complaint reason config utilities', () => {
  it('过滤停用项并按 sortOrder、数字 id 稳定排序', () => {
    const rows = [
      makeConfig(9, '其他', 20),
      makeConfig(7, '态度', 10),
      makeConfig(1, '停用项', 1, false),
      makeConfig(3, '收费', 10),
    ];

    expect(normalizeComplaintReasonConfigs(rows).map((item) => item.id)).toEqual([3, 7, 9]);
  });

  it('过滤空白 label、非法 sortOrder 和无效 id', () => {
    const rows = [
      makeConfig(1, '   ', 1),
      makeConfig(2, '打扫不干净', Number.NaN),
      makeConfig(3, '未按时', Number.POSITIVE_INFINITY),
      makeConfig(0, '无效 id', 2),
      makeConfig(4.5, '非整数 id', 2),
      makeConfig(6, '额外收费', 3),
    ];

    expect(normalizeComplaintReasonConfigs(rows).map((item) => item.id)).toEqual([6]);
  });

  it('trim label 且同排序按 id 得到确定顺序', () => {
    const rows = [
      makeConfig(8, '  服务态度  ', 10),
      makeConfig(2, '  额外收费 ', 10),
    ];

    expect(normalizeComplaintReasonConfigs(rows)).toMatchObject([
      { id: 2, label: '额外收费', sortOrder: 10 },
      { id: 8, label: '服务态度', sortOrder: 10 },
    ]);
  });

  it('远端加载成功后缓存规范化配置', async () => {
    const storage = createStorage();
    const rows = [
      makeConfig(20, '  自定义其他 ', 2),
      makeConfig(10, '停用', 1, false),
    ];
    const result = await resolveComplaintReasonConfigs(() => Promise.resolve(rows), storage);
    const normalized = [makeConfig(20, '自定义其他', 2)];

    expect(result).toEqual({ items: normalized, source: 'remote' });
    expect(storage.setStorageSync).toHaveBeenCalledWith(
      COMPLAINT_REASON_CONFIG_CACHE_KEY,
      JSON.stringify(normalized),
    );
  });

  it('远端成功为空数组时缓存空数组且不回退默认项', async () => {
    const storage = createStorage();

    await expect(
      resolveComplaintReasonConfigs(() => Promise.resolve([]), storage),
    ).resolves.toEqual({ items: [], source: 'remote' });
    expect(storage.setStorageSync).toHaveBeenCalledWith(
      COMPLAINT_REASON_CONFIG_CACHE_KEY,
      '[]',
    );
  });

  it('远端失败时读取字符串缓存并排序', async () => {
    const cached = [
      makeConfig(12, '其他', 9),
      makeConfig(4, '迟到', 1),
    ];
    const storage = createStorage(JSON.stringify(cached));
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      storage,
    );

    expect(result.source).toBe('cache');
    expect(result.items.map((item) => item.id)).toEqual([4, 12]);
  });

  it('远端失败时读取对象缓存并过滤停用项', async () => {
    const cached = [
      makeConfig(2, '其他', 2),
      makeConfig(1, '停用', 1, false),
    ];
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      createStorage(cached),
    );

    expect(result).toEqual({ items: [cached[0]], source: 'cache' });
  });

  it.each([
    ['损坏字符串', '{invalid json'],
    ['非数组对象', { id: 1 }],
  ])('远端失败且缓存为%s时返回不可用空列表', async (_name, cache) => {
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      createStorage(cache),
    );

    expect(result).toEqual({ items: [], source: 'unavailable' });
  });

  it('远端失败且无缓存时不构造虚假 id', async () => {
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      createStorage(),
    );

    expect(result).toEqual({ items: [], source: 'unavailable' });
  });

  it('不读取旧 code 缓存 key', async () => {
    const oldCodeCache = [makeConfig(8, '旧缓存伪装项', 1)];
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      createStorage(oldCodeCache, '__complaint_reason_configs__'),
    );

    expect(result).toEqual({ items: [], source: 'unavailable' });
  });

  it('当前 key 中没有有效数字 ID 的旧结构缓存也视为不可用', async () => {
    const result = await resolveComplaintReasonConfigs(
      () => Promise.reject(new Error('offline')),
      createStorage([
        { code: 'OTHER', label: '旧原因', sortOrder: 1, isEnabled: true },
      ]),
    );

    expect(result).toEqual({ items: [], source: 'unavailable' });
  });

  it.each([
    [400, 500],
    [500, 400],
  ])('业务 code=%i 或 HTTP status=%i 为 400 时识别停用冲突', (code, status) => {
    expect(
      isUnavailableComplaintReasonError(
        new ApiRequestError('该投诉原因当前已停用，请选择其他原因', code, status),
      ),
    ).toBe(true);
  });

  it('识别 400/404 的停用或删除冲突，并严格校验消息边界', () => {
    expect(
      isUnavailableComplaintReasonError(new ApiRequestError('该投诉原因不存在', 404, 500)),
    ).toBe(true);
    expect(isUnavailableComplaintReasonError(new ApiRequestError('订单状态不允许投诉', 400, 400))).toBe(
      false,
    );
    expect(
      isUnavailableComplaintReasonError(new ApiRequestError('该投诉原因不可用', 400, 400)),
    ).toBe(false);
    expect(
      isUnavailableComplaintReasonError(
        new ApiRequestError('该投诉原因当前已停用，请选择其他原因', 399, 401),
      ),
    ).toBe(false);
    expect(isUnavailableComplaintReasonError(new Error('该投诉原因当前已停用'))).toBe(false);
  });
});
