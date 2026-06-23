import { BizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({ description: '服务名称模糊查询', example: '保洁' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({
    description: '是否启用过滤（不传则返回全部，传 true 只返回启用，传 false 只返回禁用）',
    example: true,
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
