import type { AppointTimeSlotBizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { APPOINT_TIME_SLOT_BIZ_TYPES } from './create-appoint-time-slot.dto';

export class QueryAppointTimeSlotConfigDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ description: '业务类型', enum: APPOINT_TIME_SLOT_BIZ_TYPES })
  @IsOptional()
  @IsIn(APPOINT_TIME_SLOT_BIZ_TYPES)
  bizType?: AppointTimeSlotBizType;

  @ApiPropertyOptional({ description: '时段文案模糊查询' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  label?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @Transform(({ obj, key, value }) => {
    const rawValue = (obj as Record<string, unknown>)[key];
    if (rawValue === 'true' || rawValue === true) return true;
    if (rawValue === 'false' || rawValue === false) return false;
    return rawValue ?? value;
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
