import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QueryReviewDto {
  @ApiPropertyOptional({ description: '订单类型筛选', enum: ['CLEANING', 'RECYCLING'] })
  @IsOptional()
  @IsEnum(['CLEANING', 'RECYCLING'])
  orderType?: 'CLEANING' | 'RECYCLING';

  @ApiPropertyOptional({ description: '订单 ID（精确匹配）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

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
