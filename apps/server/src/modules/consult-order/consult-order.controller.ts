import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { ConsultOrderService } from './consult-order.service';
import { CreateConsultFollowUpDto } from './dto/create-consult-follow-up.dto';
import { CreateConsultOrderDto } from './dto/create-consult-order.dto';
import { QueryConsultFollowUpDto } from './dto/query-consult-follow-up.dto';
import { QueryConsultOrderDto } from './dto/query-consult-order.dto';
import { UpdateConsultStatusDto } from './dto/update-consult-status.dto';

@ApiTags('ConsultOrders')
@Controller('consult-orders')
export class ConsultOrderController {
  constructor(private readonly consultOrderService: ConsultOrderService) {}

  @Post()
  @ApiOperation({
    summary: '创建咨询单',
    description:
      '居民提交家政咨询需求，默认状态为 FOLLOW_UP（待跟进）。residentId 可选传入。' +
      'v2.0 新增字段：isProxyOrder / serviceContactName / serviceContactPhone / serviceAddress / source。',
  })
  @ApiOkResponse({ description: '创建成功，返回咨询单数据（含 CNS 前缀订单号）' })
  async create(
    @Body() createConsultOrderDto: CreateConsultOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['create']>>>> {
    const data = await this.consultOrderService.create(createConsultOrderDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询咨询单列表', description: '支持按 status / serviceType / keyword（订单号/联系人/手机号）筛选。' })
  @ApiOkResponse({ description: '查询成功，返回分页结果' })
  async findAll(
    @Query() query: QueryConsultOrderDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['findAll']>>>> {
    const data = await this.consultOrderService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询咨询单详情' })
  @ApiOkResponse({ description: '查询成功，404 = 咨询单不存在' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['findOne']>>>> {
    const data = await this.consultOrderService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '更新咨询单状态（管理员操作）',
    description:
      '合法状态路径：FOLLOW_UP（待跟进）→ FOLLOWING（跟进中）→ COMPLETED（已完成）。' +
      '不可逆，非法转移返回 HTTP 400，并写入 order_status_logs 审计记录。',
  })
  @ApiOkResponse({ description: '状态更新成功，返回最新咨询单数据' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConsultStatusDto: UpdateConsultStatusDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['updateStatus']>>>> {
    const data = await this.consultOrderService.updateStatus(id, updateConsultStatusDto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/follow-ups')
  @ApiOperation({
    summary: '新增跟进记录（v2.0）',
    description:
      '客服或运营人员为指定咨询单新增一条跟进记录（ConsultFollowUp）。' +
      '不限制咨询单当前状态，404 = 咨询单不存在。',
  })
  @ApiOkResponse({ description: '创建成功，返回跟进记录数据' })
  async createFollowUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() createConsultFollowUpDto: CreateConsultFollowUpDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['createFollowUp']>>>> {
    const data = await this.consultOrderService.createFollowUp(id, createConsultFollowUpDto);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id/follow-ups')
  @ApiOperation({
    summary: '查询跟进记录列表（v2.0）',
    description: '按时间升序返回指定咨询单的跟进记录，支持分页。404 = 咨询单不存在。',
  })
  @ApiOkResponse({ description: '查询成功，返回分页跟进记录列表' })
  async findFollowUps(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryConsultFollowUpDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ConsultOrderService['findFollowUps']>>>> {
    const data = await this.consultOrderService.findFollowUps(id, query);
    return { code: 0, message: 'ok', data };
  }
}
