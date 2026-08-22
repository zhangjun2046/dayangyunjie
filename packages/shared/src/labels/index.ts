import type {
  ComplaintStatus,
  ConsultStatus,
  OrderSource,
  OrderStatus,
  PaymentStatus,
  PhotoType,
  WorkerStatus,
} from '../enums';

/** 枚举中文展示（小程序 / 管理后台共用） */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_ASSIGN: '待派单',
  ASSIGNED: '已派单',
  ACCEPTED: '已接单',
  IN_SERVICE: '服务中',
  PENDING_REVIEW: '待评价',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};

export const CONSULT_STATUS_LABELS: Record<ConsultStatus, string> = {
  FOLLOW_UP: '待跟进',
  FOLLOWING: '跟进中',
  COMPLETED: '已完成',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: '未收款',
  PAID: '已收款',
};

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  MINIPROGRAM: '小程序',
  PHONE: '电话预约',
};

export const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  IDLE: '空闲',
  BUSY: '服务中',
};

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  BEFORE: '打扫前',
  AFTER: '打扫后',
  RECYCLING_SITE: '回收现场',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
};
