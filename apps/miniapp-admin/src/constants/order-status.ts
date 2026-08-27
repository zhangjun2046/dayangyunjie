import { ORDER_STATUS_LABELS, type OrderStatus } from '@dayangyunjie/shared';

export interface StatusPillOption {
  key: string;
  label: string;
  status?: OrderStatus;
}

export const STATUS_PILLS: StatusPillOption[] = [
  { key: 'all', label: '全部' },
  { key: 'PENDING_ASSIGN', label: ORDER_STATUS_LABELS.PENDING_ASSIGN, status: 'PENDING_ASSIGN' },
  { key: 'ASSIGNED', label: ORDER_STATUS_LABELS.ASSIGNED, status: 'ASSIGNED' },
  { key: 'ACCEPTED', label: ORDER_STATUS_LABELS.ACCEPTED, status: 'ACCEPTED' },
  { key: 'IN_SERVICE', label: ORDER_STATUS_LABELS.IN_SERVICE, status: 'IN_SERVICE' },
  { key: 'PENDING_REVIEW', label: ORDER_STATUS_LABELS.PENDING_REVIEW, status: 'PENDING_REVIEW' },
  { key: 'REVIEWED', label: ORDER_STATUS_LABELS.REVIEWED, status: 'REVIEWED' },
  { key: 'CANCELLED', label: ORDER_STATUS_LABELS.CANCELLED, status: 'CANCELLED' },
];

export function getOrderBadgeLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function getOrderBadgeClass(status: string): string {
  if (status === 'PENDING_ASSIGN') return 'badge-pending';
  if (status === 'ASSIGNED' || status === 'ACCEPTED') return 'badge-blue';
  if (status === 'IN_SERVICE' || status === 'PENDING_REVIEW') return 'badge-orange';
  if (status === 'REVIEWED') return 'badge-green';
  if (status === 'CANCELLED') return 'badge-grey';
  return 'badge-blue';
}
