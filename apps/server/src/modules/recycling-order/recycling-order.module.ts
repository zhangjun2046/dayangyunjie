import { Module } from '@nestjs/common';
import { GeoModule } from '../../common/geo/geo.module';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { OrderProgressModule } from '../../common/order-progress/order-progress.module';
import { NotifyModule } from '../notify/notify.module';
import { AppointTimeSlotModule } from '../appoint-time-slot/appoint-time-slot.module';
import { RecyclingOrderController } from './recycling-order.controller';
import { RecyclingOrderService } from './recycling-order.service';

@Module({
  imports: [GeoModule, OrderProgressModule, NotifyModule, AppointTimeSlotModule],
  controllers: [RecyclingOrderController],
  providers: [RecyclingOrderService, OrderStateMachineService],
  exports: [OrderStateMachineService],
})
export class RecyclingOrderModule {}
