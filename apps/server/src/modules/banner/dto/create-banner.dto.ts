import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

const DISPLAY_TARGETS = ['RESIDENT', 'WORKER', 'ALL'] as const;
const LINK_TYPES = ['NONE', 'PAGE', 'URL'] as const;

export class CreateBannerDto {
  @ApiProperty({ description: '轮播图图片 URL', example: 'https://cdn.example.com/banner.jpg' })
  @IsUrl()
  @MaxLength(512)
  imageUrl!: string;

  @ApiPropertyOptional({ description: '标题', example: '夏季特惠活动' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional({
    description: '展示目标：RESIDENT 居民端 / WORKER 员工端 / ALL 全部',
    enum: DISPLAY_TARGETS,
    default: 'RESIDENT',
  })
  @IsOptional()
  @IsIn(DISPLAY_TARGETS)
  displayTarget?: (typeof DISPLAY_TARGETS)[number] = 'RESIDENT';

  @ApiPropertyOptional({
    description: '链接类型：NONE 无跳转 / PAGE 小程序页面 / URL 外部链接',
    enum: LINK_TYPES,
    default: 'NONE',
  })
  @IsOptional()
  @IsIn(LINK_TYPES)
  linkType?: (typeof LINK_TYPES)[number] = 'NONE';

  @ApiPropertyOptional({ description: '跳转目标（页面路径或 URL）', example: '/pages/activity/index' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  linkTarget?: string;

  @ApiProperty({ description: '生效开始时间（ISO8601）', example: '2026-01-01T00:00:00.000Z' })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({ description: '生效结束时间（ISO8601）', example: '2026-12-31T23:59:59.000Z' })
  @IsISO8601()
  endTime!: string;

  @ApiPropertyOptional({ description: '排序权重（越小越靠前）', example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
