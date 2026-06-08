import { OrderStatus } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { OperatorTypeKey } from '../../../common/order-state-machine/order-state-machine.service';

/** 可用于 RecyclingOrder 状态流转的目标状态（§8.2 合法目标集） */
const RECYCLING_TARGET_STATUSES = [
  OrderStatus.ASSIGNED,
  OrderStatus.ACCEPTED,
  OrderStatus.IN_SERVICE,
  OrderStatus.PENDING_REVIEW,
  OrderStatus.REVIEWED,
  OrderStatus.CANCELLED,
] as const;

const OPERATOR_TYPES: OperatorTypeKey[] = ['RESIDENT', 'WORKER', 'ADMIN'];

/** PATCH /recycling-orders/:id/status 请求体 */
export class TransitionOrderDto {
  @ApiProperty({
    description: '目标状态',
    enum: RECYCLING_TARGET_STATUSES,
    example: OrderStatus.ASSIGNED,
  })
  @IsIn(RECYCLING_TARGET_STATUSES)
  toStatus!: string;

  @ApiProperty({ description: '操作人 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;

  @ApiProperty({
    description: '操作人类型',
    enum: OPERATOR_TYPES,
    example: 'ADMIN',
  })
  @IsIn(OPERATOR_TYPES)
  operatorType!: OperatorTypeKey;

  @ApiPropertyOptional({ description: '备注（取消原因等）', example: '居民主动取消' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  remark?: string;
}
