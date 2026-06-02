import type { OrderType } from '../constants';
import type { PhotoType } from '../enums';

/** 上传作业照片元数据 */
export interface UploadWorkPhotoDto {
  orderType: OrderType;
  orderId: number;
  photoType: PhotoType;
}
