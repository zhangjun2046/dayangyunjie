import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { WechatOaModule } from '../wechat-oa/wechat-oa.module';
import { NotifyScheduler } from './notify.scheduler';
import { NotifyService } from './notify.service';

@Module({
  imports: [WechatOaModule, SmsModule],
  providers: [NotifyService, NotifyScheduler],
  exports: [NotifyService],
})
export class NotifyModule {}
