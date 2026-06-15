/** 居民地址（API 出参，v2.0：name→contactName, phone→contactPhone, 新增 buildingInfo/addressTag） */
export interface AddressDto {
  id: number;
  residentId: number;
  contactName: string;
  contactPhone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  buildingInfo?: string | null;
  addressTag?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
