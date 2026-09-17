import type { AppointTimeSlotBizType } from '@dayangyunjie/shared';
import { APPOINT_TIME_SLOT_FORMAT_MESSAGE } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';

export const APPOINT_TIME_SLOT_BIZ_TYPES = ['CLEANING', 'RECYCLING'] as const;

export class CreateAppointTimeSlotConfigDto {
  @ApiProperty({ description: '业务类型', enum: APPOINT_TIME_SLOT_BIZ_TYPES })
  @IsIn(APPOINT_TIME_SLOT_BIZ_TYPES)
  bizType!: AppointTimeSlotBizType;

  @ApiProperty({ description: '时段格子', example: '08:00' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: APPOINT_TIME_SLOT_FORMAT_MESSAGE })
  label!: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = true;
}
