import { Module } from '@nestjs/common';
import { AppointTimeSlotController } from './appoint-time-slot.controller';
import { AppointTimeSlotService } from './appoint-time-slot.service';

@Module({
  controllers: [AppointTimeSlotController],
  providers: [AppointTimeSlotService],
  exports: [AppointTimeSlotService],
})
export class AppointTimeSlotModule {}
