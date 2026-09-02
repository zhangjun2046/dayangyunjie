import { BizType } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const BIZ_TYPE_VALUES = Object.values(BizType);

export class CreateServiceCatalogDto {
  @ApiProperty({ description: '业务大类', enum: BIZ_TYPE_VALUES, example: BizType.CLEANING })
  @IsIn(BIZ_TYPE_VALUES)
  bizType!: (typeof BIZ_TYPE_VALUES)[number];

  @ApiProperty({ description: '服务名称', example: '普通保洁' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ description: '副标题', example: '专业清洁，一尘不染' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  subtitle?: string;

  @ApiPropertyOptional({ description: '图标 URL', example: 'https://cdn.example.com/icon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  icon?: string;

  @ApiPropertyOptional({ description: '大件价格表整图 URL', example: 'https://cdn.example.com/poster.webp' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  priceImageUrl?: string;

  @ApiPropertyOptional({ description: '排序权重（越小越靠前）', example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
