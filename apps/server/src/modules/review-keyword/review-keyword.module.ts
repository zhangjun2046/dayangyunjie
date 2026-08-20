import { Module } from '@nestjs/common';
import { ReviewKeywordController } from './review-keyword.controller';
import { ReviewKeywordService } from './review-keyword.service';

@Module({
  controllers: [ReviewKeywordController],
  providers: [ReviewKeywordService],
})
export class ReviewKeywordModule {}
