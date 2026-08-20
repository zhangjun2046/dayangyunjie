import { Module } from '@nestjs/common';
import { ConsultOrderController } from './consult-order.controller';
import { ConsultOrderService } from './consult-order.service';
import { OrderProgressModule } from '../../common/order-progress/order-progress.module';

@Module({
  imports: [OrderProgressModule],
  controllers: [ConsultOrderController],
  providers: [ConsultOrderService],
})
export class ConsultOrderModule {}
