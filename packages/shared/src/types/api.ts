/** 统一 API 成功响应 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 统一 API 错误响应 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  data?: null;
  errors?: Record<string, string[]>;
}

/** 分页查询参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** 分页列表响应 data 结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 业务成功码（与后端约定一致） */
export const API_SUCCESS_CODE = 0;
