/** 创建/更新居民地址 */
export interface UpsertAddressDto {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}
