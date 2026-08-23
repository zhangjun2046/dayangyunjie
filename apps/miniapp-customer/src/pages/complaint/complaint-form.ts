import { isUnavailableComplaintReasonError } from '@/utils/complaint-reason-config';

export interface ComplaintSubmitState {
  selectedReasonConfigIds: number[];
  description: string;
  uploadingCount: number;
  availableReasonCount: number;
  submitting: boolean;
}

export interface UnavailableReasonRecoveryActions {
  /** 强制拉取最新配置；停用或已删除的原因会从可选项中消失 */
  reload(forceRefresh: true): Promise<unknown>;
  /** 按最新配置回写仍然可选的原因 */
  retainSelection(): void;
}

/** 配置加载后仅保留仍可用的选择，顺序保持用户勾选顺序。 */
export function retainAvailableComplaintReasons(
  selectedReasonConfigIds: readonly number[],
  isAvailable: (id: number) => boolean,
): number[] {
  return selectedReasonConfigIds.filter((id) => isAvailable(id));
}

/** 勾选 / 取消勾选一项原因，不限制选择数量。 */
export function toggleComplaintReason(
  selectedReasonConfigIds: readonly number[],
  id: number,
): number[] {
  return selectedReasonConfigIds.includes(id)
    ? selectedReasonConfigIds.filter((selected) => selected !== id)
    : [...selectedReasonConfigIds, id];
}

/** 提交按钮与提交动作共享同一份可用性判断。 */
export function canSubmitComplaint(state: ComplaintSubmitState): boolean {
  return (
    !state.submitting &&
    state.selectedReasonConfigIds.length > 0 &&
    state.description.trim().length > 0 &&
    state.uploadingCount === 0 &&
    state.availableReasonCount > 0
  );
}

/** 只有带有效已选原因的停用或删除冲突才进入刷新恢复流程。 */
export function shouldRecoverUnavailableReason(
  error: unknown,
  selectedReasonConfigIds: readonly number[],
): boolean {
  return selectedReasonConfigIds.length > 0 && isUnavailableComplaintReasonError(error);
}

/**
 * 提交时命中「原因已停用 / 已删除」冲突后的恢复：
 * 强刷配置，再按最新配置剔除失效选择。
 * 多选下服务端只报出首个冲突项，因此不逐个标记，统一以刷新后的配置为准。
 */
export async function recoverUnavailableComplaintReasons(
  error: unknown,
  selectedReasonConfigIds: readonly number[],
  actions: UnavailableReasonRecoveryActions,
): Promise<boolean> {
  if (!shouldRecoverUnavailableReason(error, selectedReasonConfigIds)) return false;

  try {
    await actions.reload(true);
  } finally {
    actions.retainSelection();
  }
  return true;
}
