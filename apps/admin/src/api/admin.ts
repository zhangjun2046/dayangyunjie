import request from './request';
import type { ApiResponse } from './request';
import type { PagedResponse } from './cleaning';

// ─── 系统管理用户 DTO ─────────────────────────────────────────────────────────

export interface AdminListItem {
  id: number;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'ENABLED' | 'DISABLED';
  source: string;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminDetail = AdminListItem;

// ─── 查询参数 ─────────────────────────────────────────────────────────────────

export interface QueryAdminParams {
  page?: number;
  pageSize?: number;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  keyword?: string;
}

// ─── 新增 / 编辑 Body ─────────────────────────────────────────────────────────

export interface CreateAdminPayload {
  username: string;
  name: string;
  email: string;
  phone?: string;
}

export type UpdateAdminPayload = Partial<Omit<CreateAdminPayload, 'username'>>;

export interface ChangeAdminPasswordPayload {
  oldPassword: string;
  newPassword: string;
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 系统管理用户列表（分页，支持 username/name/phone/email/keyword 筛选） */
export const fetchAdmins = (params?: QueryAdminParams) =>
  request.get<ApiResponse<PagedResponse<AdminListItem>>>('/admins', { params });

/** 用户详情 */
export const getAdmin = (id: number) => request.get<ApiResponse<AdminDetail>>(`/admins/${id}`);

/** 新增用户（默认密码 Dyyj123..） */
export const createAdmin = (payload: CreateAdminPayload) =>
  request.post<ApiResponse<AdminDetail>>('/admins', payload);

/** 编辑用户（用户名不可修改） */
export const updateAdmin = (id: number, payload: UpdateAdminPayload) =>
  request.put<ApiResponse<AdminDetail>>(`/admins/${id}`, payload);

/** 删除用户 */
export const deleteAdmin = (id: number) =>
  request.delete<ApiResponse<{ id: number }>>(`/admins/${id}`);

/** 切换启用/禁用状态 */
export const toggleAdminStatus = (id: number) =>
  request.patch<ApiResponse<AdminDetail>>(`/admins/${id}/toggle-status`);

/** 重置密码为默认密码 Dyyj123.. */
export const resetAdminPassword = (id: number) =>
  request.post<ApiResponse<AdminDetail>>(`/admins/${id}/reset-password`);

/** 当前登录用户自助修改密码（顶栏「修改密码」） */
export const changeAdminPassword = (id: number, payload: ChangeAdminPasswordPayload) =>
  request.put<ApiResponse<AdminDetail>>(`/admins/${id}/change-password`, payload);
