import { describe, expect, it, vi } from 'vitest';
import {
  buildComplaintReasonQuery,
  createConfigLoadCoordinator,
  formatReviewKeywordDate,
  getConfigTabCapabilities,
  prepareConfigSearch,
  resetConfigListFilters,
  reviewKeywordBizTypeLabel,
  shouldGoToPreviousPage,
  type ConfigLoadResult,
  type ConfigTab,
} from './review-keywords.utils';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('review keyword page utilities', () => {
  it.each([
    ['CLEANING', '保洁服务'],
    ['RECYCLING', '废品回收'],
  ] as const)('将 %s 显示为 %s', (type, label) => {
    expect(reviewKeywordBizTypeLabel(type)).toBe(label);
  });

  it('使用 24 小时制格式化时间', () => {
    const result = formatReviewKeywordDate('2026-08-20T07:30:00.000Z');
    expect(result).not.toMatch(/AM|PM/i);
    expect(result).toContain('2026');
  });

  it.each([
    [1, 2, true],
    [1, 1, false],
    [2, 2, false],
  ])('rowCount=%s currentPage=%s => %s', (rowCount, currentPage, expected) => {
    expect(shouldGoToPreviousPage(rowCount, currentPage)).toBe(expected);
  });

  it('构造投诉页签查询参数并 trim 搜索文案', () => {
    expect(buildComplaintReasonQuery({
      keyword: '  清洁不到位  ',
      isEnabled: false,
      page: 3,
      pageSize: 20,
    })).toEqual({
      label: '清洁不到位',
      isEnabled: false,
      page: 3,
      pageSize: 20,
    });
  });

  it('空白搜索文案转换为 undefined 且保留全部状态', () => {
    expect(buildComplaintReasonQuery({
      keyword: '   ',
      isEnabled: undefined,
      page: 1,
      pageSize: 10,
    })).toEqual({
      label: undefined,
      isEnabled: undefined,
      page: 1,
      pageSize: 10,
    });
  });

  it('搜索时保留关键词和状态，仅将实际页码重置为第一页', () => {
    const state = { keyword: '清洁', isEnabled: false, page: 4 };

    prepareConfigSearch(state);

    expect(state).toEqual({ keyword: '清洁', isEnabled: false, page: 1 });
  });

  it.each(['重置', '切换页签'])('%s 时清空关键词、状态并重置实际页码', () => {
    const state = { keyword: '清洁', isEnabled: true as boolean | undefined, page: 4 };

    resetConfigListFilters(state);

    expect(state).toEqual({ keyword: '', isEnabled: undefined, page: 1 });
  });

  it('投诉页签允许新增和删除', () => {
    expect(getConfigTabCapabilities('COMPLAINT')).toEqual({
      canCreate: true,
      canDelete: true,
    });
  });

  it.each(['CLEANING', 'RECYCLING'] as const)('%s 页签允许维护关键词', (tab) => {
    expect(getConfigTabCapabilities(tab)).toEqual({
      canCreate: true,
      canDelete: true,
    });
  });

  it('COMPLAINT 慢请求在切换 CLEANING 后不能覆盖数据或关闭 loading', async () => {
    type Row = { label: string };
    const complaintRequest = createDeferred<ConfigLoadResult<Row>>();
    const cleaningRequest = createDeferred<ConfigLoadResult<Row>>();
    let activeTab: ConfigTab = 'COMPLAINT';
    let loading = false;
    let appliedRows: Row[] = [];
    const errors: unknown[] = [];
    const fetchData = vi.fn((tab: ConfigTab) =>
      tab === 'COMPLAINT' ? complaintRequest.promise : cleaningRequest.promise,
    );
    const coordinator = createConfigLoadCoordinator<Row>({
      getActiveTab: () => activeTab,
      setLoading: (value) => {
        loading = value;
      },
      fetchData,
      applyResult: (result) => {
        appliedRows = result.items;
      },
      onError: (error) => {
        errors.push(error);
      },
    });

    const complaintLoad = coordinator.load();
    activeTab = 'CLEANING';
    const cleaningLoad = coordinator.load();
    complaintRequest.resolve({ items: [{ label: '旧投诉原因' }], total: 1 });
    await complaintLoad;

    expect(fetchData).toHaveBeenNthCalledWith(1, 'COMPLAINT');
    expect(fetchData).toHaveBeenNthCalledWith(2, 'CLEANING');
    expect(appliedRows).toEqual([]);
    expect(errors).toEqual([]);
    expect(loading).toBe(true);

    cleaningRequest.resolve({ items: [{ label: '最新保洁关键词' }], total: 1 });
    await cleaningLoad;

    expect(appliedRows).toEqual([{ label: '最新保洁关键词' }]);
    expect(loading).toBe(false);
  });

  it('仅最新请求的错误会记录并完成 loading 收尾', async () => {
    const staleRequest = createDeferred<ConfigLoadResult<never>>();
    const latestRequest = createDeferred<ConfigLoadResult<never>>();
    const staleError = new Error('stale complaint failure');
    const latestError = new Error('latest cleaning failure');
    let activeTab: ConfigTab = 'COMPLAINT';
    let loading = false;
    const recordedErrors: Array<{ error: unknown; tab: ConfigTab }> = [];
    const coordinator = createConfigLoadCoordinator<never>({
      getActiveTab: () => activeTab,
      setLoading: (value) => {
        loading = value;
      },
      fetchData: (tab) => (
        tab === 'COMPLAINT' ? staleRequest.promise : latestRequest.promise
      ),
      applyResult: vi.fn(),
      onError: (error, tab) => {
        recordedErrors.push({ error, tab });
      },
    });

    const staleLoad = coordinator.load();
    activeTab = 'CLEANING';
    const latestLoad = coordinator.load();
    staleRequest.reject(staleError);
    await staleLoad;

    expect(recordedErrors).toEqual([]);
    expect(loading).toBe(true);

    latestRequest.reject(latestError);
    await latestLoad;

    expect(recordedErrors).toEqual([{ error: latestError, tab: 'CLEANING' }]);
    expect(loading).toBe(false);
  });
});
