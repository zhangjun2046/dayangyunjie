/** 居民地址（API 出参） */
export interface AddressDto {
  id: number;
  residentId: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
