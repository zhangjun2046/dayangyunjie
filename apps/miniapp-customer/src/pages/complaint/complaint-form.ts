import { isUnavailableComplaintReasonError } from '@/utils/complaint-reason-config';

export interface ComplaintSubmitState {
  selectedReasonConfigId: number | null;
  description: string;
  uploadingCount: number;
  availableReasonCount: number;
  submitting: boolean;
}

export interface UnavailableReasonRecoveryDecision {
  shouldRecover: boolean;
  unavailableId: number | null;
}

export interface UnavailableReasonRecoveryActions {
  clearSelection(): void;
  reload(forceRefresh: true): Promise<unknown>;
  markUnavailable(id: number): void;
}

/** 配置加载后仅保留仍可用的选择。 */
export function retainAvailableComplaintReason(
  selectedReasonConfigId: number | null,
  isAvailable: (id: number) => boolean,
): number | null {
  return selectedReasonConfigId !== null && isAvailable(selectedReasonConfigId)
    ? selectedReasonConfigId
    : null;
}

/** 提交按钮与提交动作共享同一份可用性判断。 */
export function canSubmitComplaint(state: ComplaintSubmitState): boolean {
  return (
    !state.submitting &&
    state.selectedReasonConfigId !== null &&
    state.description.trim().length > 0 &&
    state.uploadingCount === 0 &&
    state.availableReasonCount > 0
  );
}

/** 只有带有效已选原因的停用或删除冲突才进入刷新恢复流程。 */
export function decideUnavailableReasonRecovery(
  error: unknown,
  selectedReasonConfigId: number | null,
): UnavailableReasonRecoveryDecision {
  if (selectedReasonConfigId === null || !isUnavailableComplaintReasonError(error)) {
    return { shouldRecover: false, unavailableId: null };
  }
  return { shouldRecover: true, unavailableId: selectedReasonConfigId };
}

/** 清空失效选择，强制刷新配置，并确保冲突 ID 不会被缓存重新带回。 */
export async function recoverUnavailableComplaintReason(
  error: unknown,
  selectedReasonConfigId: number | null,
  actions: UnavailableReasonRecoveryActions,
): Promise<boolean> {
  const decision = decideUnavailableReasonRecovery(error, selectedReasonConfigId);
  if (!decision.shouldRecover || decision.unavailableId === null) return false;

  actions.clearSelection();
  try {
    await actions.reload(true);
  } finally {
    actions.markUnavailable(decision.unavailableId);
  }
  return true;
}
