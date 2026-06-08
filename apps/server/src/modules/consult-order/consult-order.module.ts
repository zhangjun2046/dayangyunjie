import { Module } from '@nestjs/common';
import { ConsultOrderController } from './consult-order.controller';
import { ConsultOrderService } from './consult-order.service';

@Module({
  controllers: [ConsultOrderController],
  providers: [ConsultOrderService],
})
export class ConsultOrderModule {}
