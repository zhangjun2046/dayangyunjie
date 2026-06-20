import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ConsultStatus } from '@prisma/client';

export class QueryConsultOrderDto {
  @ApiPropertyOptional({
    description: '按状态筛选',
    enum: ConsultStatus,
    example: ConsultStatus.FOLLOW_UP,
  })
  @IsOptional()
  @IsEnum(ConsultStatus)
  status?: ConsultStatus;

  @ApiPropertyOptional({ description: '按咨询类型筛选', example: '家政咨询' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  serviceType?: string;

  @ApiPropertyOptional({ description: '关键词（模糊匹配订单号 / 联系人 / 手机号）', example: '张三' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  /** 居民 ID 过滤，居民端仅查看自己的订单 */
  @ApiPropertyOptional({ description: '居民 ID', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  residentId?: number;
}
