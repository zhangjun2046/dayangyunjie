import { Module } from '@nestjs/common';
import { RecyclingItemController } from './recycling-item.controller';
import { RecyclingItemService } from './recycling-item.service';

@Module({
  controllers: [RecyclingItemController],
  providers: [RecyclingItemService],
})
export class RecyclingItemModule {}
