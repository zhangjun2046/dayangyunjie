import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

const DISPLAY_TARGETS = ['RESIDENT', 'WORKER', 'ALL'] as const;

export class QueryActiveBannerDto {
  @ApiPropertyOptional({
    description: '展示目标过滤（不传则返回全部有效轮播图）',
    enum: DISPLAY_TARGETS,
    example: 'RESIDENT',
  })
  @IsOptional()
  @IsIn(DISPLAY_TARGETS)
  displayTarget?: (typeof DISPLAY_TARGETS)[number];
}
