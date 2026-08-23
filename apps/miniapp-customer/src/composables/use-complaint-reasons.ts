import { computed, ref } from 'vue';
import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import { fetchEnabledComplaintReasonConfigs } from '@/api/complaint-reason-config';
import {
  COMPLAINT_REASON_CONFIG_CACHE_KEY,
  resolveComplaintReasonConfigs,
  type ComplaintReasonConfigSource,
} from '@/utils/complaint-reason-config';

const configs = ref<ComplaintReasonConfigDto[]>([]);
const source = ref<ComplaintReasonConfigSource>('unavailable');
const loading = ref(false);
let hasLoaded = false;
let lastLoadedAt = 0;
let loadingPromise: Promise<ComplaintReasonConfigDto[]> | null = null;
const CONFIG_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** 全局复用一份配置，避免列表按行或多个组件重复请求。 */
export function useComplaintReasons() {
  const options = computed(() =>
    configs.value.map((item) => ({
      value: item.id,
      label: item.label,
    })),
  );

  async function load(forceRefresh = false): Promise<ComplaintReasonConfigDto[]> {
    const cacheIsFresh =
      hasLoaded &&
      lastLoadedAt > 0 &&
      Date.now() - lastLoadedAt < CONFIG_REFRESH_INTERVAL_MS;
    if (cacheIsFresh && !forceRefresh) return configs.value;
    if (loadingPromise) return loadingPromise;

    loading.value = true;
    loadingPromise = resolveComplaintReasonConfigs(fetchEnabledComplaintReasonConfigs, uni)
      .then((result) => {
        configs.value = result.items;
        source.value = result.source;
        hasLoaded = true;
        // 仅远端成功结果使用 TTL；缓存/不可用结果允许下次进入页面立即重试远端。
        lastLoadedAt = result.source === 'remote' ? Date.now() : 0;
        console.info(
          `[complaint-reasons] loaded source=${result.source} count=${result.items.length}`,
        );
        return result.items;
      })
      .finally(() => {
        loading.value = false;
        loadingPromise = null;
      });
    return loadingPromise;
  }

  function isAvailable(id: number | null): boolean {
    return id !== null && configs.value.some((item) => item.id === id);
  }

  function markUnavailable(id: number): void {
    configs.value = configs.value.filter((item) => item.id !== id);
    uni.setStorageSync(COMPLAINT_REASON_CONFIG_CACHE_KEY, JSON.stringify(configs.value));
  }

  return {
    configs,
    options,
    source,
    loading,
    load,
    isAvailable,
    markUnavailable,
  };
}
