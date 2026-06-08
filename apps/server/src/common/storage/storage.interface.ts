/**
 * 存储服务注入 Token
 * StorageModule 根据 STORAGE_PROVIDER 环境变量决定注入哪个实现：
 *   - local（默认）: LocalStorageStrategy，写入 uploads/ 目录
 *   - cos: CosStorageStrategy，上传至腾讯云 COS
 */
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface IStorageService {
  /**
   * 保存文件 Buffer 到存储后端
   * @param filename 目标文件名（含扩展名）
   * @param buffer   图片 Buffer（已完成水印处理）
   * @returns 可直接访问的图片 URL
   */
  save(filename: string, buffer: Buffer): Promise<string>;
}
