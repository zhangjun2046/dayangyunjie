/** 居民端提交家政咨询 */
export interface CreateConsultOrderDto {
  serviceType: string;
  name: string;
  phone: string;
  description: string;
}

/** 管理后台更新咨询单状态 */
export interface UpdateConsultStatusDto {
  status: string;
}

/** 咨询单列表筛选 */
export interface ConsultOrderQueryDto {
  status?: string;
  serviceType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
