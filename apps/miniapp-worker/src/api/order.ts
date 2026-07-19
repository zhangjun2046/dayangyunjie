/**
 * 员工端订单相关 API
 * - 获取 ASSIGNED（待接单）订单列表（保洁 + 废品回收并发拉取后合并）
 * - 接单操作（ASSIGNED → ACCEPTED）
 */

import { request } from './request';

/** 后端分页响应结构 */
interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 地址嵌套对象（后端可能返回对象或已格式化字符串） */
interface AddressDto {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  building?: string;
  unit?: string;
  room?: string;
  fullAddress?: string;
}

/** 后端 addressSnapshot 结构（下单时快照，包含省市区+详细地址+楼栋信息） */
interface AddressSnapshot {
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
  buildingInfo?: string;
  addressTag?: string;
  contactName?: string;
  contactPhone?: string;
}

/** 保洁订单原始 DTO */
interface CleaningOrderDto {
  id: number;
  orderNo: string;
  status: string;
  serviceItem: string;
  appointDate: string;
  appointTimeSlot: string;
  workerId: number | null;
  contactName: string;
  contactPhone: string;
  addressSnapshot?: AddressSnapshot;
}

/** 废品回收订单原始 DTO */
interface RecyclingOrderDto {
  id: number;
  orderNo: string;
  status: string;
  /** 回收类型名（与保洁的 serviceItem 同名字段，后端统一为 serviceItem） */
  serviceItem: string;
  appointDate: string;
  appointTimeSlot: string;
  workerId: number | null;
  contactName: string;
  contactPhone: string;
  addressSnapshot?: AddressSnapshot;
}

/** 统一的待接单卡片数据（用于首页渲染） */
export interface AssignedOrderItem {
  id: number;
  orderNo: string;
  orderType: 'cleaning' | 'recycling';
  serviceName: string;
  appointDate: string;
  appointTimeSlot: string;
  address: string;
  status: string;
}

/** 统一的任务列表卡片数据（用于任务页渲染，含全状态） */
export interface WorkerOrderItem {
  id: number;
  orderNo: string;
  orderType: 'cleaning' | 'recycling';
  serviceName: string;
  appointDate: string;
  appointTimeSlot: string;
  address: string;
  status: string;
}

/** 员工端可见的状态列表（排除 PENDING_ASSIGN） */
const WORKER_VISIBLE_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'IN_SERVICE',
  'PENDING_REVIEW',
  'REVIEWED',
  'CANCELLED',
].join(',');

/** 从 addressSnapshot 提取可显示的地址字符串：省市区 + 详细地址 + 楼栋信息 */
function resolveAddress(snapshot: AddressSnapshot | undefined): string {
  if (!snapshot) return '';
  const parts: string[] = [];
  if (snapshot.district) parts.push(snapshot.district);
  if (snapshot.detail) parts.push(snapshot.detail);
  if (snapshot.buildingInfo) parts.push(snapshot.buildingInfo);
  if (parts.length > 0) return parts.join('');
  // 降级：省市区拼接
  return [snapshot.province, snapshot.city, snapshot.district].filter(Boolean).join('');
}

/** 将 ISO 日期截取日期部分再格式化：2026-06-17T00:00:00.000Z → 2026.06.17 */
function formatAppointDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  // 截取前 10 位 YYYY-MM-DD，再将横杠替换为点
  return dateStr.slice(0, 10).replace(/-/g, '.');
}

/**
 * 获取当前员工的 ASSIGNED（待接单）任务列表
 * 并发拉取保洁订单与废品回收订单，按预约时间升序合并
 */
export async function fetchAssignedOrders(workerId: number): Promise<AssignedOrderItem[]> {
  console.info('[worker-order] fetchAssignedOrders, workerId=', workerId);

  const [cleaningResult, recyclingResult] = await Promise.all([
    request<PagedResult<CleaningOrderDto>>('GET', '/cleaning-orders', {
      workerId,
      statuses: 'ASSIGNED',
      page: 1,
      pageSize: 100,
    } as unknown as Record<string, unknown>),
    request<PagedResult<RecyclingOrderDto>>('GET', '/recycling-orders', {
      workerId,
      statuses: 'ASSIGNED',
      page: 1,
      pageSize: 100,
    } as unknown as Record<string, unknown>),
  ]);

  const cleaningItems: AssignedOrderItem[] = (cleaningResult?.items ?? []).map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    orderType: 'cleaning' as const,
    serviceName: o.serviceItem,
    appointDate: formatAppointDate(o.appointDate),
    appointTimeSlot: o.appointTimeSlot,
    address: resolveAddress(o.addressSnapshot),
    status: o.status,
  }));

  const recyclingItems: AssignedOrderItem[] = (recyclingResult?.items ?? []).map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    orderType: 'recycling' as const,
    serviceName: o.serviceItem,
    appointDate: formatAppointDate(o.appointDate),
    appointTimeSlot: o.appointTimeSlot,
    address: resolveAddress(o.addressSnapshot),
    status: o.status,
  }));

  const merged = [...cleaningItems, ...recyclingItems];

  // 按预约日期 + 时间段升序排列（ISO / 点分格式字典序均有效）
  merged.sort((a, b) => {
    const keyA = `${a.appointDate} ${a.appointTimeSlot}`;
    const keyB = `${b.appointDate} ${b.appointTimeSlot}`;
    return keyA.localeCompare(keyB);
  });

  console.info('[worker-order] fetchAssignedOrders done, count=', merged.length);
  return merged;
}

/**
 * 获取员工任务列表（任务页使用，支持按 orderType 和 statuses 筛选）
 * statuses 为空数组时自动传全部员工可见状态（排除 PENDING_ASSIGN）
 */
export async function fetchWorkerOrders(
  workerId: number,
  orderType: 'cleaning' | 'recycling',
  statuses: string[],
  page: number,
  pageSize: number,
): Promise<{ items: WorkerOrderItem[]; total: number }> {
  const statusParam = statuses.length > 0 ? statuses.join(',') : WORKER_VISIBLE_STATUSES;
  const path = orderType === 'cleaning' ? '/cleaning-orders' : '/recycling-orders';

  console.info('[worker-order] fetchWorkerOrders, type=', orderType, 'statuses=', statusParam, 'page=', page);

  const result = await request<PagedResult<CleaningOrderDto | RecyclingOrderDto>>(
    'GET',
    path,
    { workerId, statuses: statusParam, page, pageSize } as unknown as Record<string, unknown>,
  );

  const items: WorkerOrderItem[] = (result?.items ?? []).map((o) => {
    const serviceName =
      orderType === 'cleaning'
        ? (o as CleaningOrderDto).serviceItem
        : (o as RecyclingOrderDto).serviceItem;
    return {
      id: o.id,
      orderNo: o.orderNo,
      orderType,
      serviceName,
      appointDate: formatAppointDate(o.appointDate),
      appointTimeSlot: o.appointTimeSlot,
      address: resolveAddress(o.addressSnapshot),
      status: o.status,
    };
  });

  return { items, total: result?.total ?? 0 };
}

/**
 * 员工接单：ASSIGNED → ACCEPTED
 * @param orderType  订单类型（cleaning | recycling）
 * @param orderId    订单 ID
 * @param operatorId 操作员 ID（员工本人 worker.id）
 */
export async function acceptOrder(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
  operatorId: number,
): Promise<void> {
  const path =
    orderType === 'cleaning'
      ? `/cleaning-orders/${orderId}/accept`
      : `/recycling-orders/${orderId}/accept`;
  console.info('[worker-order] acceptOrder, type=', orderType, 'orderId=', orderId);
  await request<unknown>('POST', path, { operatorId });
}

/** 作业照片 */
export interface WorkPhoto {
  id: number;
  url: string;
  photoType?: string;
  createdAt?: string;
}

/** 订单详情通用字段（保洁 + 废品共用） */
export interface OrderDetailDto {
  id: number;
  orderNo: string;
  status: string;
  /** 保洁：服务项目名；废品：回收类型名 */
  serviceItem?: string;
  serviceType?: string;
  /** 保洁：服务时长（小时） */
  serviceDuration?: number;
  /** 废品：预估重量（kg） */
  estimatedWeight?: number;
  appointDate: string;
  appointTimeSlot: string;
  contactName: string;
  contactPhone: string;
  addressSnapshot?: AddressSnapshot;
  /** 代下单字段 */
  isProxyOrder?: boolean;
  serviceContactName?: string;
  serviceContactPhone?: string;
  remark?: string;
  /** 备注 */
  notes?: string;
  /** 状态时间戳（可选，后端按实际状态返回） */
  createdAt?: string;
  assignedAt?: string;
  acceptedAt?: string;
  gpsCheckinAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  /** GPS 签到信息 */
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsDistance?: number | null;
  gpsRemark?: string | null;
  /** 作业照片 */
  workPhotos?: WorkPhoto[];
}

/** GPS 签到结果（后端返回更新后的订单部分字段） */
interface GpsCheckinResult {
  gpsDistance?: number;
  gpsRemark?: string | null;
}

/**
 * 获取订单详情
 * @param orderType  cleaning | recycling
 * @param orderId    订单 ID
 */
export async function fetchOrderDetail(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
): Promise<OrderDetailDto> {
  const path =
    orderType === 'cleaning' ? `/cleaning-orders/${orderId}` : `/recycling-orders/${orderId}`;
  console.info('[worker-order] fetchOrderDetail, type=', orderType, 'orderId=', orderId);
  const result = await request<OrderDetailDto>('GET', path);
  return result;
}

/**
 * 完成服务：IN_SERVICE → PENDING_REVIEW
 * 保洁和废品回收均使用对称的 /complete 接口
 * @param orderType       cleaning | recycling
 * @param orderId         订单 ID
 * @param beforePhotoUrls 服务前照片 URL 列表
 * @param afterPhotoUrls  服务后照片 URL 列表
 * @param operatorId      员工 ID
 */
export async function completeOrder(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
  beforePhotoUrls: string[],
  afterPhotoUrls: string[],
  operatorId: number,
): Promise<void> {
  const path =
    orderType === 'cleaning'
      ? `/cleaning-orders/${orderId}/complete`
      : `/recycling-orders/${orderId}/complete`;
  console.info(
    '[worker-order] completeOrder, type=', orderType,
    'orderId=', orderId,
    'before=', beforePhotoUrls.length,
    'after=', afterPhotoUrls.length,
  );
  await request<unknown>('POST', path, { beforePhotoUrls, afterPhotoUrls, operatorId });
}

/**
 * GPS 签到：ACCEPTED → IN_SERVICE
 * 后端超距（>200m）时不阻断，仅写入 gpsRemark；前端按返回判断是否提示
 * @param orderType  cleaning | recycling
 * @param orderId    订单 ID
 * @param lat        纬度（gcj02）
 * @param lng        经度（gcj02）
 * @param operatorId 员工 ID
 * @returns 签到结果（含 gpsDistance / gpsRemark）
 */
export async function gpsCheckin(
  orderType: 'cleaning' | 'recycling',
  orderId: number,
  lat: number,
  lng: number,
  operatorId: number,
): Promise<GpsCheckinResult> {
  const path =
    orderType === 'cleaning'
      ? `/cleaning-orders/${orderId}/gps-checkin`
      : `/recycling-orders/${orderId}/gps-checkin`;
  console.info('[worker-order] gpsCheckin, type=', orderType, 'orderId=', orderId, 'lat=', lat, 'lng=', lng);
  const result = await request<GpsCheckinResult>('POST', path, { lat, lng, operatorId });
  return result ?? {};
}
