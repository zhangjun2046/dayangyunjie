/** 居民端提交家政咨询（v2.0：name→contactName, phone→contactPhone, description→requirementDesc） */
export interface CreateConsultOrderDto {
  serviceType: string;
  contactName: string;
  contactPhone: string;
  requirementDesc: string;
  residentId?: number;
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
