import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class QueryRecyclingItemDto {
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

  @ApiPropertyOptional({ description: '所属服务目录 ID', example: 4 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  catalogId?: number;

  @ApiPropertyOptional({ description: '品项名称模糊查询', example: '纸' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({
    description: '是否启用过滤（不传则返回全部）',
    example: true,
  })
  @Transform(({ obj, key, value }) => {
    const rawValue = (obj as Record<string, unknown>)[key];
    if (rawValue === 'true' || rawValue === true) return true;
    if (rawValue === 'false' || rawValue === false) return false;
    return rawValue ?? value;
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class QueryEnabledRecyclingItemDto {
  @ApiPropertyOptional({ description: '所属服务目录 ID', example: 4 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  catalogId?: number;
}
