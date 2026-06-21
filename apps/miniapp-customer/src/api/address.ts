/**
 * 地址管理 API
 */

import { request } from './request';

export interface AddressDto {
  id: number;
  residentId: number;
  contactName: string;
  contactPhone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取居民地址列表（默认地址排在最前）
 * GET /addresses?residentId=X
 */
export async function fetchAddresses(residentId: number): Promise<AddressDto[]> {
  const result = await request<PageResult<AddressDto>>('GET', '/addresses', {
    residentId,
    pageSize: 20,
  });
  const list = result.items ?? [];
  return list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}

export interface CreateAddressParams {
  residentId: number;
  contactName: string;
  contactPhone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

/**
 * 新增地址
 * POST /addresses
 */
export function createAddress(params: CreateAddressParams): Promise<AddressDto> {
  return request<AddressDto>('POST', '/addresses', params as unknown as Record<string, unknown>);
}

/**
 * 更新地址
 * PUT /addresses/:id
 */
export function updateAddress(
  id: number,
  params: Partial<Omit<CreateAddressParams, 'residentId'>>,
): Promise<AddressDto> {
  return request<AddressDto>(
    'PUT',
    `/addresses/${id}`,
    params as unknown as Record<string, unknown>,
  );
}

/**
 * 删除地址
 * DELETE /addresses/:id
 */
export function deleteAddress(id: number): Promise<void> {
  return request<void>('DELETE', `/addresses/${id}`);
}

/**
 * 设置默认地址
 * PUT /addresses/:id/default
 */
export function setDefaultAddress(id: number): Promise<AddressDto> {
  return request<AddressDto>('PUT', `/addresses/${id}/default`);
}
