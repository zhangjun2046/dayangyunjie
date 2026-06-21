import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

const COMPLAINT_STATUS_VALUES = ['PENDING', 'PROCESSING', 'COMPLETED'] as const;
const ORDER_TYPE_VALUES = ['CLEANING', 'RECYCLING', 'CONSULT'] as const;

export class QueryComplaintDto {
  @ApiPropertyOptional({ description: '投诉状态筛选', enum: COMPLAINT_STATUS_VALUES })
  @IsOptional()
  @IsEnum(COMPLAINT_STATUS_VALUES)
  status?: typeof COMPLAINT_STATUS_VALUES[number];

  @ApiPropertyOptional({ description: '订单类型筛选', enum: ORDER_TYPE_VALUES })
  @IsOptional()
  @IsEnum(ORDER_TYPE_VALUES)
  orderType?: typeof ORDER_TYPE_VALUES[number];

  @ApiPropertyOptional({ description: '订单ID筛选（需配合 orderType 使用）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({ description: '居民ID筛选（查询指定居民的所有投诉）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId?: number;

  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
