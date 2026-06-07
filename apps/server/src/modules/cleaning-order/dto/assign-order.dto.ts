import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** POST /cleaning-orders/:id/assign 请求体 — 管理员派单 */
export class AssignOrderDto {
  @ApiProperty({ description: '分配的员工 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId!: number;

  /** 操作人固定为管理员，此处传管理员 ID */
  @ApiProperty({ description: '操作人 ID（管理员）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
