import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { CreateReviewKeywordDto } from './dto/create-review-keyword.dto';
import { QueryReviewKeywordDto } from './dto/query-review-keyword.dto';
import { UpdateReviewKeywordDto } from './dto/update-review-keyword.dto';
import { ReviewKeywordService } from './review-keyword.service';

@ApiTags('ReviewKeywords')
@Controller('review-keywords')
export class ReviewKeywordController {
  constructor(private readonly reviewKeywordService: ReviewKeywordService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '新增评价关键词' })
  @ApiOkResponse({ description: '创建成功' })
  async create(@Body() dto: CreateReviewKeywordDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询评价关键词' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(@Query() query: QueryReviewKeywordDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询评价关键词详情' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '编辑评价关键词' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewKeywordDto,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除评价关键词' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.remove(id);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '切换评价关键词启用状态' })
  async toggle(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.reviewKeywordService.toggle(id);
    return { code: 0, message: 'ok', data };
  }
}
