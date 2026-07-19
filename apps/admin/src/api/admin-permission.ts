import request from './request';
import type { ApiResponse } from './request';

export interface AdminPermissionsResult {
  adminId: number;
  isSuperAdmin: boolean;
  menuKeys: string[];
}

/** 查询用户功能授权清单（本人可查自己，超级管理员可查任何人） */
export const getAdminPermissions = (id: number) =>
  request.get<ApiResponse<AdminPermissionsResult>>(`/admins/${id}/permissions`);

/** 覆盖保存用户功能授权清单（仅超级管理员） */
export const saveAdminPermissions = (id: number, menuKeys: string[]) =>
  request.put<ApiResponse<AdminPermissionsResult>>(`/admins/${id}/permissions`, { menuKeys });
