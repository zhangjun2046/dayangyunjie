export interface StatusPillOption {
  key: string;
  label: string;
  statuses: string[];
}

/** 员工端看不到平台尚未派出的 PENDING_ASSIGN 订单。 */
export const WORKER_VISIBLE_STATUSES: readonly string[] = [
  'ASSIGNED',
  'ACCEPTED',
  'IN_SERVICE',
  'PENDING_REVIEW',
  'REVIEWED',
  'CANCELLED',
];

export const WORKER_PENDING_ACCEPT_STATUSES: readonly string[] = ['ASSIGNED'];

/**
 * 第一阶段只收口现有统计状态，不改变统计语义。
 * “完成服务即计入”的最终口径由第三阶段实现。
 */
export const WORKER_DONE_STATUSES: readonly string[] = ['PENDING_REVIEW', 'REVIEWED'];

export const STATUS_PILLS: StatusPillOption[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'ASSIGNED', label: '已派单', statuses: ['ASSIGNED'] },
  { key: 'ACCEPTED', label: '已接单', statuses: ['ACCEPTED'] },
  { key: 'IN_SERVICE', label: '服务中', statuses: ['IN_SERVICE'] },
  { key: 'PENDING_REVIEW', label: '待评价', statuses: ['PENDING_REVIEW'] },
  { key: 'REVIEWED', label: '已评价', statuses: ['REVIEWED'] },
  { key: 'CANCELLED', label: '已取消', statuses: ['CANCELLED'] },
];

/** 员工端列表、详情头图和筛选使用同一套规范名。 */
export const WORKER_ORDER_BADGE_LABELS: Record<string, string> = {
  ASSIGNED: '已派单',
  ACCEPTED: '已接单',
  IN_SERVICE: '服务中',
  PENDING_REVIEW: '待评价',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};

export function getOrderBadgeLabel(status: string): string {
  return WORKER_ORDER_BADGE_LABELS[status] ?? status;
}

export function getOrderBadgeClass(status: string): string {
  if (status === 'ASSIGNED' || status === 'ACCEPTED') return 'badge-blue';
  if (status === 'IN_SERVICE' || status === 'PENDING_REVIEW') return 'badge-orange';
  if (status === 'REVIEWED') return 'badge-green';
  if (status === 'CANCELLED') return 'badge-grey';
  return 'badge-blue';
}
