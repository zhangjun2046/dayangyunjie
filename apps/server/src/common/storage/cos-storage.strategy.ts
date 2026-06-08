import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { IStorageService } from './storage.interface';

/**
 * 腾讯云 COS 存储策略（生产期使用）
 *
 * 启用方式：
 *  1. 在 apps/server/.env 中设置 STORAGE_PROVIDER=cos
 *  2. 填写 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
 *  3. 安装 SDK：npm install -w apps/server cos-nodejs-sdk-v5
 *  4. 取消下方 TODO 注释，替换 stub 实现
 *
 * 当前状态：占位 stub，STORAGE_PROVIDER=cos 时抛出 NotImplementedException。
 */
@Injectable()
export class CosStorageStrategy implements IStorageService {
  private readonly logger = new Logger(CosStorageStrategy.name);

  constructor(
    private readonly secretId: string,
    private readonly secretKey: string,
    private readonly bucket: string,
    private readonly region: string,
  ) {
    this.logger.warn(
      'CosStorageStrategy is a stub. Install cos-nodejs-sdk-v5 and implement save() before deploying.',
    );
  }

  /**
   * TODO: 部署前替换此方法
   * 参考实现（需先 npm install cos-nodejs-sdk-v5）：
   *
   * import COS from 'cos-nodejs-sdk-v5';
   * const cos = new COS({ SecretId: this.secretId, SecretKey: this.secretKey });
   * await cos.putObject({
   *   Bucket: this.bucket, Region: this.region,
   *   Key: filename, Body: buffer,
   * });
   * const signedUrl = await cos.getObjectUrl({
   *   Bucket: this.bucket, Region: this.region,
   *   Key: filename, Sign: true, Expires: 3600,
   * });
   * return signedUrl;
   */
  async save(_filename: string, _buffer: Buffer): Promise<string> {
    this.logger.error(
      `CosStorageStrategy.save() not implemented. SecretId=${this.secretId}, Bucket=${this.bucket}/${this.region}`,
    );
    throw new NotImplementedException(
      'COS 存储尚未配置，请安装 cos-nodejs-sdk-v5 并实现 CosStorageStrategy.save()',
    );
  }
}
