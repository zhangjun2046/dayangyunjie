import request from './request';
import type { ApiResponse } from './request';

// ─── 请求参数 ─────────────────────────────────────────────────────────────────

export interface DashboardQuery {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

// ─── 响应类型 ─────────────────────────────────────────────────────────────────

export interface SummaryData {
  /** 时间范围内保洁+废品订单合计（不含家政咨询） */
  total: number;
  /** 时间范围内已完成（COMPLETED / REVIEWED） */
  completed: number;
  /** 时间范围内进行中（ACCEPTED / IN_PROGRESS） */
  inProgress: number;
  /** 时间范围内待接单（PENDING） */
  pending: number;
}

export interface OrderTrendData {
  dates: string[];
  cleaning: number[];
  recycling: number[];
  consult: number[];
}

export interface PieItem {
  name: string;
  value: number;
}

export interface ServiceTypeDistributionData {
  data: PieItem[];
}

export interface RatingDistributionData {
  data: PieItem[];
}

export interface HourlyDistributionData {
  hours: string[];
  counts: number[];
}

export interface WorkerPerformanceItem {
  workerId: number;
  name: string;
  employeeNo: string;
  totalOrders: number;
  completedInRange: number;
  rating: number;
  status: string;
}

export interface WorkerPerformanceData {
  items: WorkerPerformanceItem[];
}

// ─── API 方法 ─────────────────────────────────────────────────────────────────

/** 统计卡汇总（时间范围内总数/已完成/进行中/待接单，保洁+废品） */
export const getSummary = (query?: DashboardQuery) =>
  request.get<ApiResponse<SummaryData>>('/dashboard/summary', { params: query });

/** 订单趋势折线图 */
export const getOrderTrend = (query?: DashboardQuery) =>
  request.get<ApiResponse<OrderTrendData>>('/dashboard/order-trend', { params: query });

/** 服务类型环形图 */
export const getServiceTypeDistribution = (query?: DashboardQuery) =>
  request.get<ApiResponse<ServiceTypeDistributionData>>('/dashboard/service-type-distribution', { params: query });

/** 满意度分布环形图 */
export const getRatingDistribution = (query?: DashboardQuery) =>
  request.get<ApiResponse<RatingDistributionData>>('/dashboard/rating-distribution', { params: query });

/** 时段柱状图 */
export const getHourlyDistribution = (query?: DashboardQuery) =>
  request.get<ApiResponse<HourlyDistributionData>>('/dashboard/hourly-distribution', { params: query });

/** 员工绩效排名 */
export const getWorkerPerformance = (query?: DashboardQuery) =>
  request.get<ApiResponse<WorkerPerformanceData>>('/dashboard/worker-performance', { params: query });
