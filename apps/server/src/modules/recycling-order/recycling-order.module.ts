import { Module } from '@nestjs/common';
import { GeoModule } from '../../common/geo/geo.module';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { RecyclingOrderController } from './recycling-order.controller';
import { RecyclingOrderService } from './recycling-order.service';

@Module({
  imports: [GeoModule],
  controllers: [RecyclingOrderController],
  providers: [RecyclingOrderService, OrderStateMachineService],
  exports: [OrderStateMachineService],
})
export class RecyclingOrderModule {}
