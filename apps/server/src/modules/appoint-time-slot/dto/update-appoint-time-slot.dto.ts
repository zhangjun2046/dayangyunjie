import { APPOINT_TIME_SLOT_FORMAT_MESSAGE } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class UpdateAppointTimeSlotConfigDto {
  @ApiPropertyOptional({ description: '时段格子', example: '08:30' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: APPOINT_TIME_SLOT_FORMAT_MESSAGE })
  label?: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
