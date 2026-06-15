import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryActiveBannerDto } from './dto/query-active-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@ApiTags('Banners')
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: '新增轮播图' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() dto: CreateBannerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['create']>>>> {
    const data = await this.bannerService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询轮播图列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryBannerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['findAll']>>>> {
    const data = await this.bannerService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  /**
   * 必须在 GET :id 之前声明，防止 Express 将 'active' 匹配为 :id
   */
  @Get('active')
  @ApiOperation({ summary: '查询当前有效轮播图（供小程序首页使用）' })
  @ApiOkResponse({ description: '查询成功' })
  async findActive(
    @Query() query: QueryActiveBannerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['findActive']>>>> {
    const data = await this.bannerService.findActive(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询轮播图详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['findOne']>>>> {
    const data = await this.bannerService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑轮播图' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['update']>>>> {
    const data = await this.bannerService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除轮播图' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<BannerService['remove']>>>> {
    const data = await this.bannerService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
