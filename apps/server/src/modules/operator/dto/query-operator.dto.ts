import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class QueryOperatorDto {
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

  @ApiPropertyOptional({ description: '用途过滤', example: '接单' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  purpose?: string;

  @ApiPropertyOptional({ description: '姓名模糊搜索', example: '张' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string;

  @ApiPropertyOptional({ description: '手机号模糊搜索', example: '138' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: '姓名或手机号模糊搜索', example: '张' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  keyword?: string;
}
