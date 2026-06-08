import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({
    summary: '提交服务评价',
    description:
      '居民对已完成服务（PENDING_REVIEW 状态）提交星级/标签/文字/图片评价。' +
      '评价提交成功后，订单状态自动变为 REVIEWED（已评价）。' +
      '同一订单不可重复评价，非 PENDING_REVIEW 状态订单返回 400。',
  })
  @ApiOkResponse({ description: '评价提交成功，返回评价详情' })
  async create(
    @Body() dto: CreateReviewDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ReviewService['create']>>>> {
    const data = await this.reviewService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({
    summary: '分页查询评价列表',
    description: '支持按 orderType / orderId 筛选，按 id 倒序返回。',
  })
  @ApiOkResponse({ description: '查询成功，返回分页结果' })
  async findAll(
    @Query() query: QueryReviewDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ReviewService['findAll']>>>> {
    const data = await this.reviewService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询评价详情', description: '按评价 ID 查询，不存在返回 404。' })
  @ApiOkResponse({ description: '查询成功，返回评价详情' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ReviewService['findOne']>>>> {
    const data = await this.reviewService.findOne(id);
    return { code: 0, message: 'ok', data };
  }
}
