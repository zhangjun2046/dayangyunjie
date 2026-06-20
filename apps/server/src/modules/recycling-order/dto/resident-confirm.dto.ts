import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** POST /recycling-orders/:id/resident-confirm 请求体 — 居民验收废品服务 */
export class ResidentConfirmDto {
  @ApiProperty({ description: '居民 ID（操作人）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
