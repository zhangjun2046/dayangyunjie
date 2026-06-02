import type { WorkerStatus } from '../enums';

/** 管理后台创建员工 */
export interface CreateWorkerDto {
  employeeNo: string;
  password: string;
  name: string;
  phone: string;
  openid?: string;
  skills: string[];
}

/** 更新员工信息 */
export interface UpdateWorkerDto {
  name?: string;
  phone?: string;
  status?: WorkerStatus;
  skills?: string[];
  avatar?: string;
}
