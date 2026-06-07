import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { CleaningOrderService } from './cleaning-order.service';
import { CreateCleaningOrderDto } from './dto/create-cleaning-order.dto';
import { QueryCleaningOrderDto } from './dto/query-cleaning-order.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { UpdateCleaningOrderDto } from './dto/update-cleaning-order.dto';

@ApiTags('CleaningOrders')
@Controller('cleaning-orders')
export class CleaningOrderController {
  constructor(private readonly cleaningOrderService: CleaningOrderService) {}

  @Post()
  @ApiOperation({ summary: '创建保洁订单' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createCleaningOrderDto: CreateCleaningOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<CleaningOrderService['create']>>>> {
    const data = await this.cleaningOrderService.create(createCleaningOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询保洁订单列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryCleaningOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<CleaningOrderService['findAll']>>>> {
    const data = await this.cleaningOrderService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询保洁订单详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<CleaningOrderService['findOne']>>>> {
    const data = await this.cleaningOrderService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新保洁订单预约信息' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCleaningOrderDto: UpdateCleaningOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<CleaningOrderService['update']>>>> {
    const data = await this.cleaningOrderService.update(id, updateCleaningOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '保洁订单状态机转移（P2.5b 验收入口）',
    description:
      '按 §8.2 合法状态转移规则变更订单状态，并自动写入 order_status_logs 审计记录。' +
      '非法转移（含取消规则）返回 HTTP 400。',
  })
  @ApiOkResponse({ description: '状态变更成功，返回最新订单数据' })
  async transitionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() transitionOrderDto: TransitionOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<CleaningOrderService['transitionStatus']>>>> {
    const data = await this.cleaningOrderService.transitionStatus(id, transitionOrderDto);
    return { code: 0, message: 'ok', data };
  }
}
