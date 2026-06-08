import { Module } from '@nestjs/common';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { RecyclingOrderController } from './recycling-order.controller';
import { RecyclingOrderService } from './recycling-order.service';

@Module({
  controllers: [RecyclingOrderController],
  providers: [RecyclingOrderService, OrderStateMachineService],
  exports: [OrderStateMachineService],
})
export class RecyclingOrderModule {}
