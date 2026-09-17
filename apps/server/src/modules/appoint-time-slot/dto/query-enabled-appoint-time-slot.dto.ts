import type { AppointTimeSlotBizType } from '@dayangyunjie/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { APPOINT_TIME_SLOT_BIZ_TYPES } from './create-appoint-time-slot.dto';

export class QueryEnabledAppointTimeSlotDto {
  @ApiProperty({ description: '业务类型', enum: APPOINT_TIME_SLOT_BIZ_TYPES })
  @IsIn(APPOINT_TIME_SLOT_BIZ_TYPES)
  bizType!: AppointTimeSlotBizType;
}
