import { Module } from '@nestjs/common';
import { WechatOaController } from './wechat-oa.controller';
import { WechatOaService } from './wechat-oa.service';

@Module({
  controllers: [WechatOaController],
  providers: [WechatOaService],
  exports: [WechatOaService],
})
export class WechatOaModule {}
