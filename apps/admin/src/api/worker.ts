import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 员工 DTO ─────────────────────────────────────────────────────────────────

export interface WorkerListItem {
  id: number;
  name: string;
  phone: string;
  employeeNo: string;
  skillType: string;
  /** @deprecated 旧字段兼容保留 */
  skills?: string[];
  status: 'IDLE' | 'BUSY';
  employmentStatus: 'ACTIVE' | 'RESIGNED';
  rating: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  acceptedOrders: number;
  completionRate: number | null;
  todayOrders: number;
  nickname?: string;
  gender?: string;
  position?: string;
  idCard?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  healthCertUrl?: string;
  healthCertExpiry?: string | null;
  /** @deprecated 使用 skillCertUrls；旧字段仅用于兼容历史客户端 */
  skillCertUrl?: string;
  skillCertUrls?: string[];
  skillCertExpiry?: string | null;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkerDetail = WorkerListItem;

// ─── 新增/编辑 DTO ────────────────────────────────────────────────────────────

export interface CreateWorkerPayload {
  employeeNo: string;
  password: string;
  name: string;
  phone: string;
  skillType: string;
  nickname?: string;
  gender?: string;
  idCard?: string;
  position?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  healthCertUrl?: string;
  healthCertExpiry?: string;
  /** @deprecated 使用 skillCertUrls；旧字段仅用于兼容历史客户端 */
  skillCertUrl?: string;
  skillCertUrls?: string[];
  skillCertExpiry?: string;
  status?: 'IDLE' | 'BUSY';
  employmentStatus?: 'ACTIVE' | 'RESIGNED';
  rating?: number;
}

export type UpdateWorkerPayload = Partial<Omit<CreateWorkerPayload, 'password'> & { password?: string }>;

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryWorkerParams {
  page?: number;
  pageSize?: number;
  name?: string;
  phone?: string;
  status?: string;
  employmentStatus?: string;
  skillType?: string;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 员工列表（分页，支持 name/phone/status/skillType 筛选） */
export const fetchWorkers = (params?: QueryWorkerParams) =>
  request.get<ApiResponse<PagedResponse<WorkerListItem>>>('/workers', { params });

/** 员工详情 */
export const getWorker = (id: number) =>
  request.get<ApiResponse<WorkerDetail>>(`/workers/${id}`);

/** 新增员工 */
export const createWorker = (payload: CreateWorkerPayload) =>
  request.post<ApiResponse<WorkerDetail>>('/workers', payload);

/** 编辑员工 */
export const updateWorker = (id: number, payload: UpdateWorkerPayload) =>
  request.put<ApiResponse<WorkerDetail>>(`/workers/${id}`, payload);

/** 删除员工 */
export const deleteWorker = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/workers/${id}`);

/** 管理员重置密码为手机号 */
export const resetWorkerPassword = (id: number) =>
  request.post<ApiResponse<WorkerDetail>>(`/workers/${id}/reset-password`);
