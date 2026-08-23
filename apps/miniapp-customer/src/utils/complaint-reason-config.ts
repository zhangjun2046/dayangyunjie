import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import { ApiRequestError } from '../api/errors';

export const COMPLAINT_REASON_CONFIG_CACHE_KEY = '__complaint_reason_configs_v2__';

export type ComplaintReasonConfigSource = 'remote' | 'cache' | 'unavailable';

export interface ResolvedComplaintReasonConfigs {
  items: ComplaintReasonConfigDto[];
  source: ComplaintReasonConfigSource;
}

interface StorageAdapter {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
}

/** 仅保留结构有效且启用的配置，并确保客户端排序稳定。 */
export function normalizeComplaintReasonConfigs(
  rows: readonly ComplaintReasonConfigDto[],
): ComplaintReasonConfigDto[] {
  return rows
    .filter(
      (row) =>
        row?.isEnabled === true &&
        Number.isInteger(row.id) &&
        row.id > 0 &&
        typeof row.label === 'string' &&
        row.label.trim().length > 0 &&
        Number.isFinite(row.sortOrder),
    )
    .map((row) => ({
      ...row,
      label: row.label.trim(),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** 远端成功时更新 ID 版缓存；失败时只使用同版本的有效缓存。 */
export async function resolveComplaintReasonConfigs(
  fetcher: () => Promise<ComplaintReasonConfigDto[]>,
  storage: StorageAdapter,
): Promise<ResolvedComplaintReasonConfigs> {
  try {
    const items = normalizeComplaintReasonConfigs(await fetcher());
    storage.setStorageSync(COMPLAINT_REASON_CONFIG_CACHE_KEY, JSON.stringify(items));
    return { items, source: 'remote' };
  } catch (error) {
    console.info('[complaint-reasons] remote config unavailable', error);
    const cached = readCachedComplaintReasonConfigs(storage);
    if (cached) {
      return { items: cached, source: 'cache' };
    }
    return { items: [], source: 'unavailable' };
  }
}

/** 识别提交瞬间原因被停用或删除的可恢复业务冲突。 */
export function isUnavailableComplaintReasonError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    ([400, 404].includes(error.code) || [400, 404].includes(error.statusCode)) &&
    error.message.includes('投诉原因') &&
    (error.message.includes('停用') || error.message.includes('不存在'))
  );
}

function readCachedComplaintReasonConfigs(
  storage: StorageAdapter,
): ComplaintReasonConfigDto[] | null {
  try {
    const raw = storage.getStorageSync(COMPLAINT_REASON_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;
    const normalized = normalizeComplaintReasonConfigs(parsed as ComplaintReasonConfigDto[]);
    return parsed.length > 0 && normalized.length === 0 ? null : normalized;
  } catch (error) {
    console.info('[complaint-reasons] cached config invalid', error);
    return null;
  }
}
