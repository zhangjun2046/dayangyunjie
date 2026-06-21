/**
 * 文件上传 API
 * POST /upload/image — 上传图片（含水印），返回可访问 URL
 */

import { getTokenFromStorage, UPLOAD_BASE_URL } from './request';

/**
 * 上传单张图片
 * @param filePath uni.chooseImage 返回的临时文件路径
 * @param orderNo 可选订单号（写入水印）
 * @returns 图片的可访问 URL
 */
export function uploadImage(filePath: string, orderNo?: string): Promise<string> {
  const token = getTokenFromStorage();

  const queryStr = orderNo ? `?orderNo=${encodeURIComponent(orderNo)}` : '';
  const url = `${UPLOAD_BASE_URL}/upload/image${queryStr}`;

  const header: Record<string, string> = {};
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      header,
      success(res) {
        try {
          const body = JSON.parse(res.data) as {
            code: number;
            message: string;
            data: { url: string };
          };
          if (body.code === 0 && body.data?.url) {
            console.info('[upload] image uploaded, url=', body.data.url);
            resolve(body.data.url);
          } else {
            reject(new Error(body.message || '上传失败'));
          }
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail(err) {
        console.info('[upload] uploadFile fail', err);
        reject(new Error('上传请求失败'));
      },
    });
  });
}
