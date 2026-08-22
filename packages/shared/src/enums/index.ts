/** 保洁 / 废品订单状态（与 Prisma OrderStatus 一致） */
export const OrderStatus = {
  PENDING_ASSIGN: 'PENDING_ASSIGN',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_SERVICE: 'IN_SERVICE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  REVIEWED: 'REVIEWED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** 家政咨询单状态（v2.0：PENDING→FOLLOW_UP，FOLLOWING_UP→FOLLOWING） */
export const ConsultStatus = {
  FOLLOW_UP: 'FOLLOW_UP',
  FOLLOWING: 'FOLLOWING',
  COMPLETED: 'COMPLETED',
} as const;
export type ConsultStatus = (typeof ConsultStatus)[keyof typeof ConsultStatus];

/** 收款状态 */
export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** 订单来源（v2.0：删除 PROXY，代下单由 isProxyOrder 字段独立标记） */
export const OrderSource = {
  MINIPROGRAM: 'MINIPROGRAM',
  PHONE: 'PHONE',
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

/** 员工在岗状态 */
export const WorkerStatus = {
  IDLE: 'IDLE',
  BUSY: 'BUSY',
} as const;
export type WorkerStatus = (typeof WorkerStatus)[keyof typeof WorkerStatus];

/** 作业照片类型 */
export const PhotoType = {
  BEFORE: 'BEFORE',
  AFTER: 'AFTER',
  RECYCLING_SITE: 'RECYCLING_SITE',
} as const;
export type PhotoType = (typeof PhotoType)[keyof typeof PhotoType];

/** 投诉处理状态 */
export const ComplaintStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];
