import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';

const fetchReasonConfigs = vi.hoisted(() => vi.fn());

vi.mock('@/api/complaint-reason-config', () => ({
  fetchEnabledComplaintReasonConfigs: fetchReasonConfigs,
}));

function makeConfig(
  id: number,
  label: string,
  sortOrder = 0,
): ComplaintReasonConfigDto {
  return {
    id,
    label,
    sortOrder,
    isEnabled: true,
    createdAt: '',
    updatedAt: '',
  };
}

async function createSubject() {
  const { useComplaintReasons } = await import('./use-complaint-reasons');
  return useComplaintReasons();
}

describe('useComplaintReasons', () => {
  let now: number;

  beforeEach(() => {
    vi.resetModules();
    fetchReasonConfigs.mockReset();
    now = new Date('2026-08-20T12:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    let stored: unknown;
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn(() => stored),
      setStorageSync: vi.fn((_key: string, value: unknown) => {
        stored = value;
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('初始不构造默认 id 且 source 为 unavailable', async () => {
    const subject = await createSubject();

    expect(subject.configs.value).toEqual([]);
    expect(subject.options.value).toEqual([]);
    expect(subject.source.value).toBe('unavailable');
  });

  it('首次加载远端配置并以数字 ID 更新 options', async () => {
    fetchReasonConfigs.mockResolvedValue([makeConfig(23, '平台其他')]);
    const subject = await createSubject();

    await expect(subject.load()).resolves.toEqual([makeConfig(23, '平台其他')]);
    expect(fetchReasonConfigs).toHaveBeenCalledTimes(1);
    expect(subject.source.value).toBe('remote');
    expect(subject.options.value).toEqual([{ value: 23, label: '平台其他' }]);
  });

  it('5 分钟 TTL 内复用已加载结果', async () => {
    fetchReasonConfigs.mockResolvedValue([makeConfig(3, '其他')]);
    const subject = await createSubject();

    const first = await subject.load();
    now += 5 * 60 * 1000 - 1;
    const second = await subject.load();

    expect(second).toEqual(first);
    expect(fetchReasonConfigs).toHaveBeenCalledTimes(1);
  });

  it('TTL 过期后刷新远端配置', async () => {
    fetchReasonConfigs
      .mockResolvedValueOnce([makeConfig(3, '旧文案')])
      .mockResolvedValueOnce([makeConfig(3, '新文案')]);
    const subject = await createSubject();

    await subject.load();
    now += 5 * 60 * 1000;
    await subject.load();

    expect(fetchReasonConfigs).toHaveBeenCalledTimes(2);
    expect(subject.options.value).toEqual([{ value: 3, label: '新文案' }]);
  });

  it('forceRefresh 在 TTL 内仍刷新', async () => {
    fetchReasonConfigs
      .mockResolvedValueOnce([makeConfig(3, '旧文案')])
      .mockResolvedValueOnce([makeConfig(3, '强制刷新文案')]);
    const subject = await createSubject();

    await subject.load();
    await subject.load(true);

    expect(fetchReasonConfigs).toHaveBeenCalledTimes(2);
    expect(subject.options.value).toEqual([{ value: 3, label: '强制刷新文案' }]);
  });

  it('并发加载复用同一个进行中的请求', async () => {
    let resolveFetch!: (rows: ComplaintReasonConfigDto[]) => void;
    fetchReasonConfigs.mockImplementation(
      () =>
        new Promise<ComplaintReasonConfigDto[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const subject = await createSubject();

    const first = subject.load();
    const second = subject.load();
    resolveFetch([makeConfig(3, '并发结果')]);

    await expect(Promise.all([first, second])).resolves.toEqual([
      [makeConfig(3, '并发结果')],
      [makeConfig(3, '并发结果')],
    ]);
    expect(fetchReasonConfigs).toHaveBeenCalledTimes(1);
  });

  it('远端失败使用兜底后，下次加载仍可立即重试', async () => {
    fetchReasonConfigs
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([makeConfig(3, '恢复成功')]);
    const subject = await createSubject();

    await expect(subject.load()).resolves.toEqual([]);
    expect(subject.source.value).toBe('unavailable');
    await expect(subject.load()).resolves.toEqual([makeConfig(3, '恢复成功')]);

    expect(fetchReasonConfigs).toHaveBeenCalledTimes(2);
    expect(subject.source.value).toBe('remote');
  });

  it('isAvailable 与 markUnavailable 响应配置变化', async () => {
    fetchReasonConfigs.mockResolvedValue([
      makeConfig(9, '其他'),
      makeConfig(11, '打扫不干净', 1),
    ]);
    const subject = await createSubject();
    await subject.load();

    expect(subject.isAvailable(9)).toBe(true);
    expect(subject.isAvailable(null)).toBe(false);
    subject.markUnavailable(9);
    expect(subject.isAvailable(9)).toBe(false);
    expect(subject.options.value).toEqual([{ value: 11, label: '打扫不干净' }]);
  });
});
