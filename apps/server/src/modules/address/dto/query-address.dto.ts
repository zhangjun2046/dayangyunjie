import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryAddressDto {
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

  @ApiPropertyOptional({ description: '居民 ID 过滤', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  residentId?: number;

  @ApiPropertyOptional({ description: '是否默认地址过滤', example: true })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
