import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReassignOrderDto {
  @ApiProperty({ description: '改派后的员工 ID', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId!: number;

  @ApiProperty({ description: '操作人 ID（管理员）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
