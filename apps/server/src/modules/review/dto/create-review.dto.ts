import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: '订单类型', enum: ['CLEANING', 'RECYCLING'] })
  @IsEnum(['CLEANING', 'RECYCLING'])
  orderType!: 'CLEANING' | 'RECYCLING';

  @ApiProperty({ description: '订单 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty({ description: '操作居民 ID（用于审计日志）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId!: number;

  @ApiProperty({ description: '星级评分（1–5）', minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({
    description: '标签数组（准时/专业/干净等）',
    example: ['准时', '干净', '专业'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @ApiPropertyOptional({ description: '文字评语（最长 1000 字符）', example: '服务非常好！' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({ description: '评价图片 URL 列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
