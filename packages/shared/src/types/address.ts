/** 订单 addressSnapshot JSON 结构（Schema §11） */
export interface AddressSnapshot {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  lat?: number;
  lng?: number;
}
