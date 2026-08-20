export type CustomerOrderKind = 'cleaning' | 'recycling' | 'consult';

export interface StatusFilterOption {
  key: string;
  label: string;
  statuses: string[];
}

/** 居民视角有意将待派单、已派单、已接单折叠为「待服务」。 */
export const CUSTOMER_ORDER_BADGE_LABELS: Record<string, string> = {
  PENDING_ASSIGN: '待服务',
  ASSIGNED: '待服务',
  ACCEPTED: '待服务',
  IN_SERVICE: '进行中',
  PENDING_REVIEW: '待反馈',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};

export const CUSTOMER_CONSULT_BADGE_LABELS: Record<string, string> = {
  FOLLOW_UP: '待跟进',
  FOLLOWING: '跟进中',
  COMPLETED: '已完成',
};

export const CUSTOMER_ORDER_STATUS_TIPS: Record<string, string> = {
  PENDING_ASSIGN: '订单已提交，等待平台安排服务人员',
  ASSIGNED: '已为您分配服务人员，请等待上门',
  ACCEPTED: '服务人员已确认接单，准备上门',
  IN_SERVICE: '服务人员正在为您服务',
  PENDING_REVIEW: '服务已完成，期待您的评价',
  REVIEWED: '感谢您的评价',
  CANCELLED: '订单已取消',
  FOLLOW_UP: '咨询单已提交，等待跟进',
  FOLLOWING: '运营人员正在跟进您的需求',
  COMPLETED: '服务已完成',
};

export const FILTERS_MAIN: StatusFilterOption[] = [
  { key: 'all', label: '全部', statuses: [] },
  {
    key: 'waiting',
    label: '待服务',
    statuses: ['PENDING_ASSIGN', 'ASSIGNED', 'ACCEPTED'],
  },
  { key: 'IN_SERVICE', label: '进行中', statuses: ['IN_SERVICE'] },
  { key: 'PENDING_REVIEW', label: '待反馈', statuses: ['PENDING_REVIEW'] },
  { key: 'REVIEWED', label: '已评价', statuses: ['REVIEWED'] },
  { key: 'CANCELLED', label: '已取消', statuses: ['CANCELLED'] },
];

export const FILTERS_CONSULT: StatusFilterOption[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'FOLLOW_UP', label: '待跟进', statuses: ['FOLLOW_UP'] },
  { key: 'FOLLOWING', label: '跟进中', statuses: ['FOLLOWING'] },
  { key: 'COMPLETED', label: '已完成', statuses: ['COMPLETED'] },
];

export function getOrderBadgeLabel(status: string, orderKind: CustomerOrderKind): string {
  const labels =
    orderKind === 'consult' ? CUSTOMER_CONSULT_BADGE_LABELS : CUSTOMER_ORDER_BADGE_LABELS;
  return labels[status] ?? status;
}

export function getOrderBadgeClass(status: string): string {
  if (['PENDING_ASSIGN', 'ASSIGNED', 'ACCEPTED', 'FOLLOW_UP'].includes(status)) {
    return 'badge-blue';
  }
  if (['IN_SERVICE', 'PENDING_REVIEW', 'FOLLOWING'].includes(status)) {
    return 'badge-orange';
  }
  if (['REVIEWED', 'COMPLETED'].includes(status)) return 'badge-green';
  if (status === 'CANCELLED') return 'badge-grey';
  return 'badge-blue';
}

export function canCancelOrder(status: string, orderKind: CustomerOrderKind): boolean {
  return orderKind !== 'consult' && status === 'PENDING_ASSIGN';
}

export function canReviewOrder(status: string, orderKind: CustomerOrderKind): boolean {
  return orderKind !== 'consult' && status === 'PENDING_REVIEW';
}

export function canComplaintOrder(status: string, orderKind: CustomerOrderKind): boolean {
  return (
    orderKind !== 'consult' &&
    ['ACCEPTED', 'IN_SERVICE', 'PENDING_REVIEW', 'REVIEWED'].includes(status)
  );
}
