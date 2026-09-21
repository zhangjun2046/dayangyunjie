/** 业务大类（ServiceCatalog.bizType） */
export const BizType = {
  CLEANING: 'CLEANING',
  RECYCLING: 'RECYCLING',
  CONSULT: 'CONSULT',
} as const;
export type BizType = (typeof BizType)[keyof typeof BizType];

/** 订单类型（WorkPhoto / Review / Complaint.orderType） */
export const OrderType = {
  CLEANING: 'CLEANING',
  RECYCLING: 'RECYCLING',
  CONSULT: 'CONSULT',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

/** 废品回收物品类型 */
export const RecyclingItemType = {
  LARGE: 'LARGE',
  SMALL: 'SMALL',
} as const;
export type RecyclingItemType = (typeof RecyclingItemType)[keyof typeof RecyclingItemType];

export const BIZ_TYPE_LABELS: Record<BizType, string> = {
  CLEANING: '保洁服务',
  RECYCLING: '废品回收',
  CONSULT: '家政咨询',
};

export const RECYCLING_ITEM_TYPE_LABELS: Record<RecyclingItemType, string> = {
  LARGE: '大件类',
  SMALL: '小件类',
};

/** 员工查看已改派走的任务详情（服务端 message 与员工端失败页共用） */
export const WORKER_TASK_REASSIGNED_MESSAGE = '该任务已改派给其他员工';
export const WORKER_TASK_REASSIGNED_HINT = '可返回任务列表查看当前任务';
