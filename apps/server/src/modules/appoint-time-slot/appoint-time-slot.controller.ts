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
import { AppointTimeSlotService } from './appoint-time-slot.service';
import { CreateAppointTimeSlotConfigDto } from './dto/create-appoint-time-slot.dto';
import { QueryAppointTimeSlotConfigDto } from './dto/query-appoint-time-slot.dto';
import { QueryEnabledAppointTimeSlotDto } from './dto/query-enabled-appoint-time-slot.dto';
import { UpdateAppointTimeLeadDto } from './dto/update-appoint-time-lead.dto';
import { UpdateAppointTimeSlotConfigDto } from './dto/update-appoint-time-slot.dto';

@ApiTags('AppointTimeSlots')
@Controller('appoint-time-slots')
export class AppointTimeSlotController {
  constructor(private readonly appointTimeSlotService: AppointTimeSlotService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '新增预约时段' })
  async create(@Body() dto: CreateAppointTimeSlotConfigDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '公开查询某业务已启用预约时段' })
  @ApiOkResponse({ description: '按排序返回启用格子' })
  async findEnabled(
    @Query() query: QueryEnabledAppointTimeSlotDto,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.findEnabled(query.bizType);
    return { code: 0, message: 'ok', data };
  }

  @Get('lead')
  @ApiOperation({ summary: '公开查询某业务最短提前分钟' })
  async findLead(
    @Query() query: QueryEnabledAppointTimeSlotDto,
  ): Promise<ApiResponseDto<unknown>> {
    const leadMinutes = await this.appointTimeSlotService.getLeadMinutes(query.bizType);
    return { code: 0, message: 'ok', data: { bizType: query.bizType, leadMinutes } };
  }

  @Get('leads')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '管理端读取保洁/废品缓冲分钟' })
  async findLeads(): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.getLeads();
    return { code: 0, message: 'ok', data };
  }

  @Put('leads')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '管理端保存保洁/废品缓冲分钟' })
  async updateLeads(@Body() dto: UpdateAppointTimeLeadDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.updateLeads(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '管理端分页查询预约时段配置' })
  async findAll(@Query() query: QueryAppointTimeSlotConfigDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '修改预约时段文案和排序' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointTimeSlotConfigDto,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '切换预约时段启用状态' })
  async toggle(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.toggle(id);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除预约时段配置' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.appointTimeSlotService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
