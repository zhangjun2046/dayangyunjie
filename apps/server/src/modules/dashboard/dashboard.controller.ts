import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: '统计卡汇总',
    description:
      '返回今日订单总量、本周订单总量、在岗员工数、全量评价平均星级。' +
      '此接口不受 startDate/endDate 控制，始终反映固定时段的实时统计值。',
  })
  @ApiOkResponse({ description: '查询成功，返回统计卡数据' })
  async getSummary(): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getSummary']>>>> {
    const data = await this.dashboardService.getSummary();
    return { code: 0, message: 'ok', data };
  }

  @Get('order-trend')
  @ApiOperation({
    summary: '订单趋势（折线图）',
    description:
      '按天返回时间范围内保洁/废品/家政三类订单的每日创建量。' +
      '缺省 startDate/endDate 时返回近 7 天数据。适配 ECharts 折线图 series。',
  })
  @ApiOkResponse({ description: '查询成功，返回各天各类订单量数组' })
  async getOrderTrend(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getOrderTrend']>>>> {
    const data = await this.dashboardService.getOrderTrend(query);
    return { code: 0, message: 'ok', data };
  }

  @Get('service-type-distribution')
  @ApiOperation({
    summary: '服务类型分布（环形图）',
    description:
      '返回时间范围内保洁/废品回收/家政咨询三类订单数量。' +
      '缺省 startDate/endDate 时统计近 30 天。适配 ECharts 饼图 / 环形图 data。',
  })
  @ApiOkResponse({ description: '查询成功，返回三类服务订单量占比数据' })
  async getServiceTypeDistribution(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getServiceTypeDistribution']>>>> {
    const data = await this.dashboardService.getServiceTypeDistribution(query);
    return { code: 0, message: 'ok', data };
  }

  @Get('rating-distribution')
  @ApiOperation({
    summary: '满意度分布（环形图）',
    description:
      '返回时间范围内 1–5 星评价的条数分布。' +
      '缺省 startDate/endDate 时统计近 30 天。适配 ECharts 饼图 / 环形图 data（5→1 星倒序）。',
  })
  @ApiOkResponse({ description: '查询成功，返回各星级评价数量' })
  async getRatingDistribution(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getRatingDistribution']>>>> {
    const data = await this.dashboardService.getRatingDistribution(query);
    return { code: 0, message: 'ok', data };
  }

  @Get('hourly-distribution')
  @ApiOperation({
    summary: '时段分布（柱状图）',
    description:
      '返回一天 24 小时各时段的订单量（保洁/废品/咨询三类合计）。' +
      '保洁/废品按 appointTimeSlot 解析小时；咨询单按 createdAt 小时统计。' +
      '缺省 startDate/endDate 时统计近 30 天。适配 ECharts 柱状图。',
  })
  @ApiOkResponse({ description: '查询成功，返回 24 小时时段分布数据' })
  async getHourlyDistribution(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getHourlyDistribution']>>>> {
    const data = await this.dashboardService.getHourlyDistribution(query);
    return { code: 0, message: 'ok', data };
  }

  @Get('worker-performance')
  @ApiOperation({
    summary: '员工绩效排名',
    description:
      '返回所有员工在时间范围内的绩效数据，按时间段内完成单量倒序排列。' +
      '缺省 startDate/endDate 时统计近 30 天。适配管理后台员工绩效表格。',
  })
  @ApiOkResponse({ description: '查询成功，返回员工绩效排名列表' })
  async getWorkerPerformance(
    @Query() query: DashboardQueryDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<DashboardService['getWorkerPerformance']>>>> {
    const data = await this.dashboardService.getWorkerPerformance(query);
    return { code: 0, message: 'ok', data };
  }
}
