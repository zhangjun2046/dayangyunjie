import type { AppointTimeLeadDto } from '@dayangyunjie/shared';
import { MAX_APPOINT_LEAD_MINUTES } from '@dayangyunjie/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateAppointTimeLeadDto implements AppointTimeLeadDto {
  @ApiProperty({ description: '保洁最短提前分钟', example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_APPOINT_LEAD_MINUTES)
  cleaningLeadMinutes!: number;

  @ApiProperty({ description: '废品最短提前分钟', example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_APPOINT_LEAD_MINUTES)
  recyclingLeadMinutes!: number;
}
