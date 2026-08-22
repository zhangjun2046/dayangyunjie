import { Module } from '@nestjs/common';
import { ComplaintReasonConfigController } from './complaint-reason-config.controller';
import { ComplaintReasonConfigService } from './complaint-reason-config.service';

@Module({
  controllers: [ComplaintReasonConfigController],
  providers: [ComplaintReasonConfigService],
})
export class ComplaintReasonConfigModule {}
