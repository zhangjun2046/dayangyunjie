import type { WorkerStatus } from '../enums';

/** 居民（API 出参） */
export interface ResidentDto {
  id: number;
  openid: string;
  nickname?: string | null;
  name?: string | null;
  phone?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 员工（API 出参，不含 passwordHash） */
export interface WorkerDto {
  id: number;
  openid: string;
  employeeNo: string;
  name: string;
  phone: string;
  avatar?: string | null;
  status: WorkerStatus;
  rating: number;
  totalOrders: number;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

/** 管理员（API 出参，不含 passwordHash） */
export interface AdminDto {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
