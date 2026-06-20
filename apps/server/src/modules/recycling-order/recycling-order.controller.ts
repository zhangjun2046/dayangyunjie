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
import { RecyclingOrderService } from './recycling-order.service';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CreateRecyclingOrderDto } from './dto/create-recycling-order.dto';
import { GpsCheckinDto } from './dto/gps-checkin.dto';
import { QueryRecyclingOrderDto } from './dto/query-recycling-order.dto';
import { ResidentConfirmDto } from './dto/resident-confirm.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { UpdateRecyclingOrderDto } from './dto/update-recycling-order.dto';

@ApiTags('RecyclingOrders')
@Controller('recycling-orders')
export class RecyclingOrderController {
  constructor(private readonly recyclingOrderService: RecyclingOrderService) {}

  @Post()
  @ApiOperation({ summary: '创建废品回收订单' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createRecyclingOrderDto: CreateRecyclingOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['create']>>>> {
    const data = await this.recyclingOrderService.create(createRecyclingOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询废品回收订单列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryRecyclingOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['findAll']>>>> {
    const data = await this.recyclingOrderService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询废品回收订单详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['findOne']>>>> {
    const data = await this.recyclingOrderService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新废品回收订单预约信息' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRecyclingOrderDto: UpdateRecyclingOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['update']>>>> {
    const data = await this.recyclingOrderService.update(id, updateRecyclingOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '废品订单状态机转移（验收入口）',
    description:
      '按 §8.2 合法状态转移规则变更订单状态，并自动写入 order_status_logs 审计记录。' +
      '非法转移（含取消规则）返回 HTTP 400。',
  })
  @ApiOkResponse({ description: '状态变更成功，返回最新订单数据' })
  async transitionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() transitionOrderDto: TransitionOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['transitionStatus']>>>> {
    const data = await this.recyclingOrderService.transitionStatus(id, transitionOrderDto);
    return { code: 0, message: 'ok', data };
  }

  // ─── 操作接口 ────────────────────────────────────────────────────────────────

  @Post(':id/assign')
  @ApiOperation({
    summary: '派单（管理员分配员工）',
    description: '管理员指定员工，写入 workerId 并将订单状态由 PENDING_ASSIGN 变更为 ASSIGNED。',
  })
  @ApiOkResponse({ description: '派单成功，返回最新订单数据' })
  async assignOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignOrderDto: AssignOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['assignOrder']>>>> {
    const data = await this.recyclingOrderService.assignOrder(id, assignOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: '接单（员工确认接受派单）',
    description: '员工接受派单，状态由 ASSIGNED 变更为 ACCEPTED。',
  })
  @ApiOkResponse({ description: '接单成功，返回最新订单数据' })
  async acceptOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptOrderDto: AcceptOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['acceptOrder']>>>> {
    const data = await this.recyclingOrderService.acceptOrder(id, acceptOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/gps-checkin')
  @ApiOperation({
    summary: 'GPS 签到（员工到达现场）',
    description:
      '员工上传到达位置经纬度，系统用 Haversine 公式计算与订单地址的距离。' +
      '超过 200m 时写入超距标记（gpsRemark），但不阻断流程。状态由 ACCEPTED 变更为 IN_SERVICE。',
  })
  @ApiOkResponse({ description: 'GPS 签到成功，返回最新订单数据（含 gps* 字段）' })
  async gpsCheckin(
    @Param('id', ParseIntPipe) id: number,
    @Body() gpsCheckinDto: GpsCheckinDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['gpsCheckin']>>>> {
    const data = await this.recyclingOrderService.gpsCheckin(id, gpsCheckinDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: '完成服务（员工上传完工照片）',
    description:
      '员工上传完工照片 URL 列表（至少 1 张），系统写入 work_photos 表（recyclingOrderId），' +
      '状态由 IN_SERVICE 变更为 PENDING_REVIEW。',
  })
  @ApiOkResponse({ description: '完成服务成功，返回最新订单数据' })
  async completeOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeOrderDto: CompleteOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['completeOrder']>>>> {
    const data = await this.recyclingOrderService.completeOrder(id, completeOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: '取消订单',
    description:
      '仅允许在 PENDING_ASSIGN 状态下取消，其他状态返回 HTTP 400。' +
      '操作人可以是居民（RESIDENT）或管理员（ADMIN）。',
  })
  @ApiOkResponse({ description: '取消成功，返回最新订单数据' })
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelOrderDto: CancelOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['cancelOrder']>>>> {
    const data = await this.recyclingOrderService.cancelOrder(id, cancelOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/resident-confirm')
  @ApiOperation({
    summary: '居民验收废品服务',
    description:
      '居民端「验收服务」按钮触发，状态由 IN_SERVICE 变更为 PENDING_REVIEW。' +
      '仅需 operatorId（居民 ID），无需照片。',
  })
  @ApiOkResponse({ description: '验收成功，返回最新订单数据' })
  async residentConfirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() residentConfirmDto: ResidentConfirmDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RecyclingOrderService['residentConfirm']>>>> {
    const data = await this.recyclingOrderService.residentConfirm(id, residentConfirmDto);
    return { code: 0, message: 'ok', data };
  }

}
