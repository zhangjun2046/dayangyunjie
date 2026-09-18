import { Module } from '@nestjs/common';
import { WechatOaModule } from '../wechat-oa/wechat-oa.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [WechatOaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
