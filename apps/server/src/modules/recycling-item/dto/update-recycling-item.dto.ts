import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRecyclingItemDto {
  @ApiPropertyOptional({ description: '所属废品服务目录 ID', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  catalogId?: number;

  @ApiPropertyOptional({ description: '品项名称', example: '纸张' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ description: '金额展示文案，不算价', example: '0.6元/kg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  priceText?: string;

  @ApiPropertyOptional({ description: '图标 URL；传 null 可清除图标', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  icon?: string | null;

  @ApiPropertyOptional({ description: '排序权重', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
