import { Module } from '@nestjs/common';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, OrderStateMachineService],
})
export class ReviewModule {}
