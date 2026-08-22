import type { ReviewKeywordBizType } from '@dayangyunjie/shared';

export type ConfigTab = ReviewKeywordBizType | 'COMPLAINT';

export interface ConfigTabCapabilities {
  canCreate: boolean;
  canDelete: boolean;
}

export interface ConfigListFilters {
  keyword: string;
  isEnabled: boolean | undefined;
  page: number;
  pageSize: number;
}

export interface ComplaintReasonQueryParams {
  label?: string;
  isEnabled?: boolean;
  page: number;
  pageSize: number;
}

export interface MutableConfigListState {
  keyword: string;
  isEnabled: boolean | undefined;
  page: number;
}

export interface ConfigLoadResult<Row> {
  items: Row[];
  total: number;
}

export interface ConfigLoadCoordinatorOptions<Row> {
  getActiveTab: () => ConfigTab;
  setLoading: (loading: boolean) => void;
  fetchData: (tab: ConfigTab) => Promise<ConfigLoadResult<Row>>;
  applyResult: (result: ConfigLoadResult<Row>, tab: ConfigTab) => void;
  onError: (error: unknown, tab: ConfigTab) => void;
}

/** 所有配置页签均允许新增和删除。 */
export function getConfigTabCapabilities(_tab: ConfigTab): ConfigTabCapabilities {
  return { canCreate: true, canDelete: true };
}

/** 构造投诉原因查询参数，空白搜索词不发送给服务端。 */
export function buildComplaintReasonQuery(
  filters: ConfigListFilters,
): ComplaintReasonQueryParams {
  return {
    label: filters.keyword.trim() || undefined,
    isEnabled: filters.isEnabled,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** 搜索条件生效前回到第一页，保留用户当前输入的筛选条件。 */
export function prepareConfigSearch(state: MutableConfigListState): void {
  state.page = 1;
}

/** 重置或切换页签时清空关键词、状态并回到第一页。 */
export function resetConfigListFilters(state: MutableConfigListState): void {
  state.keyword = '';
  state.isEnabled = undefined;
  state.page = 1;
}

/**
 * 协调配置列表异步加载。
 * 只有最新请求且请求页签仍处于激活状态时，才应用结果、记录错误或关闭 loading。
 */
export function createConfigLoadCoordinator<Row>(
  options: ConfigLoadCoordinatorOptions<Row>,
): { load: () => Promise<void> } {
  let latestRequestId = 0;

  return {
    async load(): Promise<void> {
      const requestId = ++latestRequestId;
      const requestedTab = options.getActiveTab();
      const isCurrentRequest = () =>
        requestId === latestRequestId && requestedTab === options.getActiveTab();

      options.setLoading(true);
      try {
        const result = await options.fetchData(requestedTab);
        if (isCurrentRequest()) {
          options.applyResult(result, requestedTab);
        }
      } catch (error) {
        if (isCurrentRequest()) {
          options.onError(error, requestedTab);
        }
      } finally {
        if (isCurrentRequest()) {
          options.setLoading(false);
        }
      }
    },
  };
}

/** 管理端业务类型显示名称 */
export function reviewKeywordBizTypeLabel(type: ReviewKeywordBizType): string {
  return type === 'CLEANING' ? '保洁服务' : '废品回收';
}

/** 评价关键词时间显示格式 */
export function formatReviewKeywordDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

/** 删除当前页最后一条数据时是否需要回退页码 */
export function shouldGoToPreviousPage(rowCount: number, currentPage: number): boolean {
  return rowCount === 1 && currentPage > 1;
}
