import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const COMPLAINT_REASON_VALUES = [
  'POOR_ATTITUDE',
  'NOT_CLEAN',
  'NOT_ON_TIME',
  'ITEM_DAMAGED',
  'EXTRA_CHARGE',
  'OTHER',
] as const;

const ORDER_TYPE_VALUES = ['CLEANING', 'RECYCLING', 'CONSULT'] as const;

export class CreateComplaintDto {
  @ApiProperty({
    description: '订单类型',
    enum: ORDER_TYPE_VALUES,
  })
  @IsEnum(ORDER_TYPE_VALUES)
  orderType!: 'CLEANING' | 'RECYCLING' | 'CONSULT';

  @ApiProperty({ description: '订单 ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty({
    description: '投诉原因',
    enum: COMPLAINT_REASON_VALUES,
    example: 'NOT_CLEAN',
  })
  @IsEnum(COMPLAINT_REASON_VALUES)
  reason!: typeof COMPLAINT_REASON_VALUES[number];

  @ApiProperty({ description: '投诉详细描述（最长 1000 字符）', example: '保洁员工态度很差，服务不认真' })
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ description: '凭证图片 URL 列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceImages?: string[];
}
