import type { ReviewKeywordBizType } from '@dayangyunjie/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { REVIEW_KEYWORD_BIZ_TYPES } from './create-review-keyword.dto';

export class UpdateReviewKeywordDto {
  @ApiPropertyOptional({ description: '订单业务类型', enum: REVIEW_KEYWORD_BIZ_TYPES })
  @IsOptional()
  @IsIn(REVIEW_KEYWORD_BIZ_TYPES)
  bizType?: ReviewKeywordBizType;

  @ApiPropertyOptional({ description: '评价关键词' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  keyword?: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
