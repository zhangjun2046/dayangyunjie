import { Module } from '@nestjs/common';
import { CosStorageStrategy } from './cos-storage.strategy';
import { LocalStorageStrategy } from './local-storage.strategy';
import { STORAGE_SERVICE } from './storage.interface';

/**
 * 存储模块
 * 读取 STORAGE_PROVIDER 环境变量，通过工厂函数决定注入哪个策略实现：
 *   - local（默认）: LocalStorageStrategy
 *   - cos           : CosStorageStrategy
 *
 * 切换存储后端只需修改 apps/server/.env 中的 STORAGE_PROVIDER，无需改动业务代码。
 */
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: () => {
        const provider = process.env.STORAGE_PROVIDER ?? 'local';
        if (provider === 'cos') {
          return new CosStorageStrategy(
            process.env.COS_SECRET_ID ?? '',
            process.env.COS_SECRET_KEY ?? '',
            process.env.COS_BUCKET ?? '',
            process.env.COS_REGION ?? 'ap-guangzhou',
          );
        }
        return new LocalStorageStrategy();
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
