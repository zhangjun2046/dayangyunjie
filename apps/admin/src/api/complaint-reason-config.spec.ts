import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from './request';
import {
  createComplaintReasonConfig,
  deleteComplaintReasonConfig,
  fetchComplaintReasonConfigs,
  toggleComplaintReasonConfig,
  updateComplaintReasonConfig,
} from './complaint-reason-config';

vi.mock('./request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedRequest = vi.mocked(request);

describe('admin complaint-reason-config API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 按服务端契约传递全部查询参数', () => {
    const params = {
      id: 12,
      label: '清洁',
      isEnabled: true,
      page: 2,
      pageSize: 20,
    };
    fetchComplaintReasonConfigs(params);
    expect(mockedRequest.get).toHaveBeenCalledWith('/complaint-reason-configs/admin', { params });
  });

  it('GET 无参数时显式传递空参数', () => {
    fetchComplaintReasonConfigs();
    expect(mockedRequest.get).toHaveBeenCalledWith(
      '/complaint-reason-configs/admin',
      { params: undefined },
    );
  });

  it('POST 新增投诉原因配置', () => {
    const body = { label: '清洁不到位', sortOrder: 3, isEnabled: true };
    createComplaintReasonConfig(body);
    expect(mockedRequest.post).toHaveBeenCalledWith('/complaint-reason-configs', body);
  });

  it('PUT 按数字 id 仅更新投诉原因文案', () => {
    const body = { label: '清洁不到位' };
    updateComplaintReasonConfig(12, body);
    expect(mockedRequest.put).toHaveBeenCalledWith(
      '/complaint-reason-configs/12',
      body,
    );
  });

  it('PUT 按数字 id 仅更新投诉原因排序', () => {
    const body = { sortOrder: 3 };
    updateComplaintReasonConfig(12, body);
    expect(mockedRequest.put).toHaveBeenCalledWith(
      '/complaint-reason-configs/12',
      body,
    );
  });

  it('PUT 按数字 id 同时更新投诉原因文案和排序', () => {
    const body = { label: '清洁不到位', sortOrder: 3 };
    updateComplaintReasonConfig(12, body);
    expect(mockedRequest.put).toHaveBeenCalledWith(
      '/complaint-reason-configs/12',
      body,
    );
  });

  it('PATCH 按数字 id 切换投诉原因启用状态', () => {
    toggleComplaintReasonConfig(12);
    expect(mockedRequest.patch).toHaveBeenCalledWith(
      '/complaint-reason-configs/12/toggle',
    );
  });

  it('DELETE 按数字 id 删除投诉原因配置', () => {
    deleteComplaintReasonConfig(12);
    expect(mockedRequest.delete).toHaveBeenCalledWith('/complaint-reason-configs/12');
  });

  it('GET 错误原样透传', async () => {
    const error = new Error('query failed');
    mockedRequest.get.mockRejectedValueOnce(error);

    await expect(fetchComplaintReasonConfigs({ page: 1 })).rejects.toBe(error);
  });

  it('PUT 错误原样透传', async () => {
    const error = new Error('update failed');
    mockedRequest.put.mockRejectedValueOnce(error);

    await expect(
      updateComplaintReasonConfig(12, { label: '新文案' }),
    ).rejects.toBe(error);
  });

  it('PATCH 错误原样透传', async () => {
    const error = new Error('toggle failed');
    mockedRequest.patch.mockRejectedValueOnce(error);

    await expect(toggleComplaintReasonConfig(12)).rejects.toBe(error);
  });
});
