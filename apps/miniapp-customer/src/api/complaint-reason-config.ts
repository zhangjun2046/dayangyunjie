import type { ComplaintReasonConfigDto } from '@dayangyunjie/shared';
import { request } from './request';

/** 获取居民端当前可用的投诉原因配置 */
export function fetchEnabledComplaintReasonConfigs(): Promise<ComplaintReasonConfigDto[]> {
  return request<ComplaintReasonConfigDto[]>('GET', '/complaint-reason-configs');
}
