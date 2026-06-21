import { OrderStatus } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryRecyclingOrderDto {
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

  @ApiPropertyOptional({ description: '订单状态', enum: Object.values(OrderStatus) })
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: (typeof OrderStatus)[keyof typeof OrderStatus];

  /**
   * 多状态聚合查询（逗号分隔），供居民端「待服务」Tab 使用。
   * 示例：PENDING_ASSIGN,ASSIGNED,ACCEPTED
   */
  @ApiPropertyOptional({
    description: '多状态聚合查询（逗号分隔），优先级高于 status 单值',
    example: 'PENDING_ASSIGN,ASSIGNED,ACCEPTED',
  })
  @IsOptional()
  @IsString()
  statuses?: string;

  /** 居民 ID 过滤，居民端仅查看自己的订单 */
  @ApiPropertyOptional({ description: '居民 ID', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  residentId?: number;

  /** 员工 ID 过滤，员工端仅查看分配给自己的订单 */
  @ApiPropertyOptional({ description: '员工 ID', example: 2 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  workerId?: number;

  @ApiPropertyOptional({ description: '预约日期起（ISO 日期）', example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  appointDateFrom?: string;

  @ApiPropertyOptional({ description: '预约日期止（ISO 日期）', example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  appointDateTo?: string;

  @ApiPropertyOptional({
    description: '关键词（匹配订单号/联系人/电话）',
    example: 'RCY20260608000001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}
