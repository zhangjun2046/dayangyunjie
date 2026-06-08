import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * 看板查询公共参数。
 * startDate / endDate 均为可选 ISO 日期字符串（如 "2026-06-01"）。
 * 缺省时，各接口自行决定默认时间范围（通常为近 7 天）。
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: '统计起始日期（ISO 8601，如 2026-06-01），缺省为近 7 天起始',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '统计结束日期（ISO 8601，如 2026-06-08），缺省为今日',
    example: '2026-06-08',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
