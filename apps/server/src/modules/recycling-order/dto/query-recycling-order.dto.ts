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
