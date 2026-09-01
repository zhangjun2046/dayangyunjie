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
import { CreateRecyclingItemDto } from './dto/create-recycling-item.dto';
import { QueryEnabledRecyclingItemDto, QueryRecyclingItemDto } from './dto/query-recycling-item.dto';
import { UpdateRecyclingItemDto } from './dto/update-recycling-item.dto';
import { RecyclingItemService } from './recycling-item.service';

@ApiTags('RecyclingItems')
@Controller('recycling-items')
export class RecyclingItemController {
  constructor(private readonly recyclingItemService: RecyclingItemService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '新增回收品项' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() dto: CreateRecyclingItemDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['create']>>>> {
    const data = await this.recyclingItemService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get('enabled')
  @ApiOperation({ summary: '查询启用中的回收品项（父分类也须启用）' })
  @ApiOkResponse({ description: '查询成功' })
  async findEnabled(
    @Query() query: QueryEnabledRecyclingItemDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['findEnabled']>>>> {
    const data = await this.recyclingItemService.findEnabled(query);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询回收品项列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryRecyclingItemDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['findAll']>>>> {
    const data = await this.recyclingItemService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询回收品项详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['findOne']>>>> {
    const data = await this.recyclingItemService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '编辑回收品项' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecyclingItemDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['update']>>>> {
    const data = await this.recyclingItemService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除回收品项' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['remove']>>>> {
    const data = await this.recyclingItemService.remove(id);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '切换回收品项启用/停用状态' })
  @ApiOkResponse({ description: '切换成功' })
  async toggle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingItemService['toggle']>>>> {
    const data = await this.recyclingItemService.toggle(id);
    return { code: 0, message: 'ok', data };
  }
}
