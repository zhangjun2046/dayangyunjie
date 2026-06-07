import { Module } from '@nestjs/common';
import { CleaningOrderController } from './cleaning-order.controller';
import { CleaningOrderService } from './cleaning-order.service';

@Module({
  controllers: [CleaningOrderController],
  providers: [CleaningOrderService],
})
export class CleaningOrderModule {}
