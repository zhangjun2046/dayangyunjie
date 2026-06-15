import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const DISPLAY_TARGETS = ['RESIDENT', 'WORKER', 'ALL'] as const;

export class QueryBannerDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ description: '展示目标过滤', enum: DISPLAY_TARGETS })
  @IsOptional()
  @IsIn(DISPLAY_TARGETS)
  displayTarget?: (typeof DISPLAY_TARGETS)[number];

  @ApiPropertyOptional({ description: '是否启用过滤' })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
