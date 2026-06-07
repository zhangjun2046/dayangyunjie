import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** POST /cleaning-orders/:id/accept 请求体 — 员工接单 */
export class AcceptOrderDto {
  /** 操作人固定为员工，此处传员工 ID */
  @ApiProperty({ description: '操作人 ID（员工）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
