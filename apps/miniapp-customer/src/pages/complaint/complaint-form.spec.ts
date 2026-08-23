import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/api/errors';
import {
  canSubmitComplaint,
  recoverUnavailableComplaintReasons,
  retainAvailableComplaintReasons,
  shouldRecoverUnavailableReason,
  toggleComplaintReason,
  type ComplaintSubmitState,
} from './complaint-form';

describe('complaint submit form decisions', () => {
  it('加载后保留可用选择并清理失效选择', () => {
    const isAvailable = vi.fn((id: number) => id === 12 || id === 15);

    expect(retainAvailableComplaintReasons([12, 20, 15], isAvailable)).toEqual([12, 15]);
    expect(retainAvailableComplaintReasons([20], isAvailable)).toEqual([]);
    expect(retainAvailableComplaintReasons([], isAvailable)).toEqual([]);
  });

  it('勾选与取消勾选，不限制选择数量', () => {
    expect(toggleComplaintReason([], 12)).toEqual([12]);
    expect(toggleComplaintReason([12], 15)).toEqual([12, 15]);
    expect(toggleComplaintReason([12, 15, 18], 15)).toEqual([12, 18]);
    // 追加保持勾选顺序
    expect(toggleComplaintReason([3, 1], 2)).toEqual([3, 1, 2]);
  });

  it('仅在原因、描述、上传和配置均就绪时允许提交', () => {
    expect(
      canSubmitComplaint({
        selectedReasonConfigIds: [12, 15],
        description: '  服务问题 ',
        uploadingCount: 0,
        availableReasonCount: 2,
        submitting: false,
      }),
    ).toBe(true);
  });

  it.each([
    ['无原因', { selectedReasonConfigIds: [] }],
    ['空白描述', { description: '   ' }],
    ['仍在上传', { uploadingCount: 1 }],
    ['无可用配置', { availableReasonCount: 0 }],
    ['正在提交', { submitting: true }],
  ])('%s 时禁止提交', (_name, override) => {
    expect(
      canSubmitComplaint({
        selectedReasonConfigIds: [12],
        description: '服务问题',
        uploadingCount: 0,
        availableReasonCount: 1,
        submitting: false,
        ...(override as Partial<ComplaintSubmitState>),
      }),
    ).toBe(false);
  });

  it('停用 400 / 删除 404 且存在选择时进入恢复流程', () => {
    expect(
      shouldRecoverUnavailableReason(new ApiRequestError('该投诉原因已停用', 400, 500), [12]),
    ).toBe(true);
    expect(
      shouldRecoverUnavailableReason(new ApiRequestError('该投诉原因不存在', 404, 404), [12, 15]),
    ).toBe(true);
  });

  it('非原因错误或无选择时不恢复', () => {
    expect(shouldRecoverUnavailableReason(new Error('网络失败'), [12])).toBe(false);
    expect(
      shouldRecoverUnavailableReason(new ApiRequestError('该投诉原因已停用', 400, 400), []),
    ).toBe(false);
  });

  it('恢复时强刷配置并按最新配置剔除失效选择', async () => {
    const calls: string[] = [];

    await expect(
      recoverUnavailableComplaintReasons(
        new ApiRequestError('该投诉原因不存在', 404, 404),
        [12, 15],
        {
          reload: async (forceRefresh) => {
            calls.push(`reload-${forceRefresh}`);
          },
          retainSelection: () => {
            calls.push('retain');
          },
        },
      ),
    ).resolves.toBe(true);

    expect(calls).toEqual(['reload-true', 'retain']);
  });

  it('刷新失败也要回写选择，避免停留在失效原因上', async () => {
    const calls: string[] = [];

    await expect(
      recoverUnavailableComplaintReasons(
        new ApiRequestError('该投诉原因已停用', 400, 500),
        [12],
        {
          reload: async () => {
            calls.push('reload');
            throw new Error('network down');
          },
          retainSelection: () => {
            calls.push('retain');
          },
        },
      ),
    ).rejects.toThrow('network down');

    expect(calls).toEqual(['reload', 'retain']);
  });
});
