import * as sharedPkg from '@dayangyunjie/shared';

/** P1.3 验收：管理后台可引用共享枚举 */
const shared = sharedPkg as unknown as {
  ComplaintStatus: { PENDING: string };
  COMPLAINT_STATUS_LABELS: Record<string, string>;
};

export const pendingLabel = shared.COMPLAINT_STATUS_LABELS[shared.ComplaintStatus.PENDING] || '待处理';
