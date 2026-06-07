import { BizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const BIZ_TYPES = Object.values(BizType);

export class QueryServiceCatalogDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({
    description: '业务大类过滤',
    enum: BIZ_TYPES,
    example: BizType.CLEANING,
  })
  @IsOptional()
  @IsIn(BIZ_TYPES)
  bizType?: (typeof BIZ_TYPES)[number];

  @ApiPropertyOptional({
    description: '是否启用过滤（默认 true，仅返回启用项）',
    example: true,
    default: true,
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive = true;
}
