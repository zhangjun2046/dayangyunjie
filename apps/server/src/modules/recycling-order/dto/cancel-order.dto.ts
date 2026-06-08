import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** 允许取消的操作人类型 */
const CANCEL_OPERATOR_TYPES = ['RESIDENT', 'ADMIN'] as const;

/** POST /recycling-orders/:id/cancel 请求体 — 取消订单 */
export class CancelOrderDto {
  @ApiProperty({ description: '操作人 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;

  @ApiProperty({
    description: '操作人类型',
    enum: CANCEL_OPERATOR_TYPES,
    example: 'RESIDENT',
  })
  @IsIn(CANCEL_OPERATOR_TYPES)
  operatorType!: 'RESIDENT' | 'ADMIN';

  @ApiPropertyOptional({ description: '取消原因', example: '居民主动取消' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
