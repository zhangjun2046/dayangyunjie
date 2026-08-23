import type { ReviewKeywordBizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { REVIEW_KEYWORD_BIZ_TYPES } from './create-review-keyword.dto';

export class QueryReviewKeywordDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ description: '订单业务类型', enum: REVIEW_KEYWORD_BIZ_TYPES })
  @IsOptional()
  @IsIn(REVIEW_KEYWORD_BIZ_TYPES)
  bizType?: ReviewKeywordBizType;

  @ApiPropertyOptional({ description: '关键词模糊查询' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  keyword?: string;

  @ApiPropertyOptional({ description: '是否启用' })
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
