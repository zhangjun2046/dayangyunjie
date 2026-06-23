import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const COMPLAINT_STATUS_VALUES = ['PENDING', 'PROCESSING', 'COMPLETED'] as const;
const ORDER_TYPE_VALUES = ['CLEANING', 'RECYCLING', 'CONSULT'] as const;

export class QueryComplaintDto {
  @ApiPropertyOptional({ description: '投诉状态筛选', enum: COMPLAINT_STATUS_VALUES })
  @IsOptional()
  @IsEnum(COMPLAINT_STATUS_VALUES)
  status?: typeof COMPLAINT_STATUS_VALUES[number];

  @ApiPropertyOptional({ description: '订单类型筛选', enum: ORDER_TYPE_VALUES })
  @IsOptional()
  @IsEnum(ORDER_TYPE_VALUES)
  orderType?: typeof ORDER_TYPE_VALUES[number];

  @ApiPropertyOptional({ description: '订单ID筛选（需配合 orderType 使用）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({ description: '居民ID筛选（查询指定居民的所有投诉）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  residentId?: number;

  @ApiPropertyOptional({ description: '员工ID筛选（查询该员工关联订单的所有投诉）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId?: number;

  @ApiPropertyOptional({
    description: '关键词（模糊匹配投诉单号 / 投诉描述 / 客户姓名）',
    example: 'CPL20260621',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '客户联系方式（精确或模糊匹配）', example: '138' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
