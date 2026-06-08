import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';

/** 地理位置公共模块：导出 GeoService 供各订单模块注入 */
@Module({
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
