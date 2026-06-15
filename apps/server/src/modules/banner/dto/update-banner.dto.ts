import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

const DISPLAY_TARGETS = ['RESIDENT', 'WORKER', 'ALL'] as const;
const LINK_TYPES = ['NONE', 'PAGE', 'URL'] as const;

export class UpdateBannerDto {
  @ApiPropertyOptional({ description: '轮播图图片 URL' })
  @IsOptional()
  @IsUrl()
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional({ description: '展示目标', enum: DISPLAY_TARGETS })
  @IsOptional()
  @IsIn(DISPLAY_TARGETS)
  displayTarget?: (typeof DISPLAY_TARGETS)[number];

  @ApiPropertyOptional({ description: '链接类型', enum: LINK_TYPES })
  @IsOptional()
  @IsIn(LINK_TYPES)
  linkType?: (typeof LINK_TYPES)[number];

  @ApiPropertyOptional({ description: '跳转目标' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  linkTarget?: string;

  @ApiPropertyOptional({ description: '生效开始时间（ISO8601）' })
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @ApiPropertyOptional({ description: '生效结束时间（ISO8601）' })
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
