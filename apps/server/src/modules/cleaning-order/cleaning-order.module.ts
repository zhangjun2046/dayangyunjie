import { Module } from '@nestjs/common';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { CleaningOrderController } from './cleaning-order.controller';
import { CleaningOrderService } from './cleaning-order.service';

@Module({
  controllers: [CleaningOrderController],
  providers: [CleaningOrderService, OrderStateMachineService],
  exports: [OrderStateMachineService],
})
export class CleaningOrderModule {}
