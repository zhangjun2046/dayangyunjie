/** 订单 addressSnapshot JSON 结构（Schema v2.0 §11：name→contactName, phone→contactPhone, 新增 buildingInfo/addressTag） */
export interface AddressSnapshot {
  contactName: string;
  contactPhone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  buildingInfo?: string;
  addressTag?: string;
  lat?: number;
  lng?: number;
}
