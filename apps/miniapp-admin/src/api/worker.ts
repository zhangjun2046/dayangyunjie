import { request } from './request';
import type { PagedResponse } from './cleaning';

export interface WorkerListItem {
  id: number;
  name: string;
  phone: string;
  employeeNo: string;
  skillType: string;
  status: 'IDLE' | 'BUSY';
  employmentStatus?: 'ACTIVE' | 'RESIGNED';
  rating: number;
  totalOrders: number;
  todayOrders: number;
  completedOrders?: number;
}

export function fetchWorkers(pageSize = 100): Promise<PagedResponse<WorkerListItem>> {
  return request<PagedResponse<WorkerListItem>>('GET', '/workers', { page: 1, pageSize });
}
