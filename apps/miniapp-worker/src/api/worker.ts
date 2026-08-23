/**
 * 员工端 Worker 相关 API
 * - 获取员工详情（含 totalOrders、rating、证书 URL 等）
 * - 员工修改密码（需 Worker JWT，由 request.ts 自动注入）
 */

import { request } from './request';

/** Worker 详情 DTO（对应后端 toPublicWorker，不含 passwordHash） */
export interface WorkerDetailDto {
  id: number;
  name: string;
  phone: string;
  employeeNo: string;
  nickname?: string | null;
  gender?: string | null;
  position?: string | null;
  skills?: string[];
  status: string;
  /** 累计已完成订单数 */
  totalOrders: number;
  /** 平均评分（0–5，保留1位小数） */
  rating: number;
  /** 今日完成服务数（按完成服务日志时间） */
  todayOrders: number;
  /** 已接单且尚未完成 */
  pendingOrders: number;
  /** 累计已完成 */
  completedOrders: number;
  acceptedOrders: number;
  completionRate: number | null;
  /** 健康证图片 URL */
  healthCertUrl?: string | null;
  healthCertExpiry?: string | null;
  /** @deprecated 使用 skillCertUrls；旧字段仅用于兼容历史数据 */
  skillCertUrl?: string | null;
  /** 技能证书图片 URL 列表 */
  skillCertUrls?: string[];
  skillCertExpiry?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 获取员工详情
 * GET /workers/:id
 */
export function fetchWorkerDetail(id: number): Promise<WorkerDetailDto> {
  console.info('[worker-api] fetchWorkerDetail, workerId=', id);
  return request<WorkerDetailDto>('GET', `/workers/${id}`);
}

/**
 * 员工修改密码（需 Worker JWT，request.ts 自动注入 Bearer token）
 * PUT /workers/:id/change-password
 * @param id          员工 ID
 * @param oldPassword 原密码
 * @param newPassword 新密码
 */
export async function changePassword(
  id: number,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  console.info('[worker-api] changePassword, workerId=', id);
  await request<unknown>('PUT', `/workers/${id}/change-password`, {
    oldPassword,
    newPassword,
  });
}
