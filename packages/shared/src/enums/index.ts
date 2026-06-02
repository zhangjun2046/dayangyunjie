/** 保洁 / 废品订单状态（与 Prisma OrderStatus 一致） */
export const OrderStatus = {
  PENDING_ASSIGN: 'PENDING_ASSIGN',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_SERVICE: 'IN_SERVICE',
  PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  REVIEWED: 'REVIEWED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** 家政咨询单状态 */
export const ConsultStatus = {
  PENDING: 'PENDING',
  FOLLOWING_UP: 'FOLLOWING_UP',
  COMPLETED: 'COMPLETED',
} as const;
export type ConsultStatus = (typeof ConsultStatus)[keyof typeof ConsultStatus];

/** 收款状态 */
export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** 订单来源 */
export const OrderSource = {
  MINIPROGRAM: 'MINIPROGRAM',
  PHONE: 'PHONE',
  PROXY: 'PROXY',
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

/** 投诉原因 */
export const ComplaintReason = {
  POOR_ATTITUDE: 'POOR_ATTITUDE',
  NOT_CLEAN: 'NOT_CLEAN',
  NOT_ON_TIME: 'NOT_ON_TIME',
  ITEM_DAMAGED: 'ITEM_DAMAGED',
  EXTRA_CHARGE: 'EXTRA_CHARGE',
  OTHER: 'OTHER',
} as const;
export type ComplaintReason = (typeof ComplaintReason)[keyof typeof ComplaintReason];

/** 投诉处理状态 */
export const ComplaintStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];
