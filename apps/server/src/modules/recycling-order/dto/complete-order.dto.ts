import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUrl, Min } from 'class-validator';

/** POST /recycling-orders/:id/complete 请求体 — 员工完成服务 */
export class CompleteOrderDto {
  @ApiProperty({
    description: '完工照片 URL 列表（至少 1 张）',
    type: [String],
    example: ['https://cdn.example.com/photo1.jpg'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  photoUrls!: string[];

  /** 操作人固定为员工，此处传员工 ID */
  @ApiProperty({ description: '操作人 ID（员工）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
