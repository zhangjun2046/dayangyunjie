import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRecyclingItemDto {
  @ApiProperty({ description: '所属废品服务目录 ID', example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  catalogId!: number;

  @ApiProperty({ description: '品项名称', example: '纸张' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiProperty({ description: '金额展示文案，不算价', example: '0.6元/kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  priceText!: string;

  @ApiPropertyOptional({ description: '图标 URL', example: 'https://cdn.example.com/icon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  icon?: string;

  @ApiPropertyOptional({ description: '排序权重（越小越靠前）', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
