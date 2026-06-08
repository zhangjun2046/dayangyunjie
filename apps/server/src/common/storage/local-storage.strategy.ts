import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { IStorageService } from './storage.interface';

/**
 * 本地磁盘存储策略（开发期使用）
 * 文件写入 {cwd}/uploads/ 目录，通过 NestJS 静态资源服务暴露为
 * http://localhost:3000/uploads/{filename}
 *
 * 切换至 COS：将 .env 中 STORAGE_PROVIDER 改为 cos，无需修改业务代码。
 */
@Injectable()
export class LocalStorageStrategy implements IStorageService {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.SERVER_BASE_URL ?? 'http://localhost:3000';
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    this.logger.log(`LocalStorage initialized. Dir: ${this.uploadsDir}`);
  }

  async save(filename: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    const url = `${this.baseUrl}/uploads/${filename}`;
    this.logger.log(`File saved locally: ${url}`);
    return url;
  }
}
