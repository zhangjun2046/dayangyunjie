import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUrl, Min } from 'class-validator';

/** POST /recycling-orders/:id/complete 请求体 — 员工完成服务 */
export class CompleteOrderDto {
  @ApiProperty({
    description: '服务前照片 URL 列表（可为空数组）',
    type: [String],
    example: ['http://localhost:3000/uploads/before1.jpg'],
  })
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  beforePhotoUrls!: string[];

  @ApiProperty({
    description: '服务后照片 URL 列表（可为空数组）',
    type: [String],
    example: ['http://localhost:3000/uploads/after1.jpg'],
  })
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  afterPhotoUrls!: string[];

  /** 操作人固定为员工，此处传员工 ID */
  @ApiProperty({ description: '操作人 ID（员工）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operatorId!: number;
}
