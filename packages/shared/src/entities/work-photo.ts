import type { OrderType } from '../constants';
import type { PhotoType } from '../enums';

/** 作业照片（API 出参） */
export interface WorkPhotoDto {
  id: number;
  cleaningOrderId?: number | null;
  recyclingOrderId?: number | null;
  orderType: OrderType;
  photoType: PhotoType;
  url: string;
  uploadedBy: number;
  createdAt: string;
}
