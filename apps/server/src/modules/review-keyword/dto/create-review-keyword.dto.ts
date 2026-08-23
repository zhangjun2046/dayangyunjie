import type { ReviewKeywordBizType } from '@dayangyunjie/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, MaxLength, Min, MinLength, IsOptional } from 'class-validator';

export const REVIEW_KEYWORD_BIZ_TYPES = ['CLEANING', 'RECYCLING'] as const;

export class CreateReviewKeywordDto {
  @ApiProperty({ description: '订单业务类型', enum: REVIEW_KEYWORD_BIZ_TYPES })
  @IsIn(REVIEW_KEYWORD_BIZ_TYPES)
  bizType!: ReviewKeywordBizType;

  @ApiProperty({ description: '评价关键词', example: '准时到达' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  keyword!: string;

  @ApiPropertyOptional({ description: '排序值，越小越靠前', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
