import { request } from './request';

export interface AdminPermissionsResult {
  adminId: number;
  isSuperAdmin: boolean;
  menuKeys: string[];
}

export function getAdminPermissions(id: number): Promise<AdminPermissionsResult> {
  return request<AdminPermissionsResult>('GET', `/admins/${id}/permissions`);
}
