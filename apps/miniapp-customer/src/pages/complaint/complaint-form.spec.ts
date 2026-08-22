import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/api/errors';
import {
  canSubmitComplaint,
  decideUnavailableReasonRecovery,
  recoverUnavailableComplaintReason,
  retainAvailableComplaintReason,
  type ComplaintSubmitState,
} from './complaint-form';

describe('complaint submit form decisions', () => {
  it('加载后保留可用选择并清理失效选择', () => {
    const isAvailable = vi.fn((id: number) => id === 12);

    expect(retainAvailableComplaintReason(12, isAvailable)).toBe(12);
    expect(retainAvailableComplaintReason(20, isAvailable)).toBeNull();
    expect(retainAvailableComplaintReason(null, isAvailable)).toBeNull();
  });

  it('仅在原因、描述、上传和配置均就绪时允许提交', () => {
    expect(
      canSubmitComplaint({
        selectedReasonConfigId: 12,
        description: '  服务问题 ',
        uploadingCount: 0,
        availableReasonCount: 1,
        submitting: false,
      }),
    ).toBe(true);
  });

  it.each([
    ['无原因', { selectedReasonConfigId: null }],
    ['空白描述', { description: '   ' }],
    ['仍在上传', { uploadingCount: 1 }],
    ['无可用配置', { availableReasonCount: 0 }],
    ['正在提交', { submitting: true }],
  ])('%s 时禁止提交', (_name, override) => {
    expect(
      canSubmitComplaint({
        selectedReasonConfigId: 12,
        description: '服务问题',
        uploadingCount: 0,
        availableReasonCount: 1,
        submitting: false,
        ...(override as Partial<ComplaintSubmitState>),
      }),
    ).toBe(false);
  });

  it('停用 400 且存在选择时决定刷新并移除冲突原因 ID', () => {
    const error = new ApiRequestError('该投诉原因已停用', 400, 500);

    expect(decideUnavailableReasonRecovery(error, 12)).toEqual({
      shouldRecover: true,
      unavailableId: 12,
    });
  });

  it('真实删除 404 消息会清空选择、强刷配置并移除原 ID', async () => {
    const calls: string[] = [];
    let selectedReasonConfigId: number | null = 12;

    await expect(
      recoverUnavailableComplaintReason(
        new ApiRequestError('该投诉原因不存在', 404, 404),
        selectedReasonConfigId,
        {
          clearSelection: () => {
            selectedReasonConfigId = null;
            calls.push('clear');
          },
          reload: async (forceRefresh) => {
            calls.push(`reload-${forceRefresh}`);
          },
          markUnavailable: (id) => {
            calls.push(`remove-${id}`);
          },
        },
      ),
    ).resolves.toBe(true);

    expect(selectedReasonConfigId).toBeNull();
    expect(calls).toEqual(['clear', 'reload-true', 'remove-12']);
  });

  it('删除 400 同样恢复，非原因错误或无选择时不恢复', () => {
    expect(
      decideUnavailableReasonRecovery(new ApiRequestError('投诉原因不存在，请重新选择', 400, 500), 12),
    ).toEqual({
      shouldRecover: true,
      unavailableId: 12,
    });
    expect(decideUnavailableReasonRecovery(new Error('网络失败'), 12)).toEqual({
      shouldRecover: false,
      unavailableId: null,
    });
    expect(
      decideUnavailableReasonRecovery(new ApiRequestError('该投诉原因已停用', 400, 400), null),
    ).toEqual({
      shouldRecover: false,
      unavailableId: null,
    });
  });
});
