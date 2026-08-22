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
import { ComplaintReasonConfigService } from './complaint-reason-config.service';
import { CreateComplaintReasonConfigDto } from './dto/create-complaint-reason-config.dto';
import { QueryComplaintReasonConfigDto } from './dto/query-complaint-reason-config.dto';
import { UpdateComplaintReasonConfigDto } from './dto/update-complaint-reason-config.dto';

@ApiTags('ComplaintReasonConfigs')
@Controller('complaint-reason-configs')
export class ComplaintReasonConfigController {
  constructor(private readonly complaintReasonConfigService: ComplaintReasonConfigService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '新增投诉原因配置' })
  async create(@Body() dto: CreateComplaintReasonConfigDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '公开查询已启用投诉原因' })
  @ApiOkResponse({ description: '按排序值返回当前已启用配置' })
  async findEnabled(): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.findEnabled();
    return { code: 0, message: 'ok', data };
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '管理端分页查询全部投诉原因配置' })
  async findAll(@Query() query: QueryComplaintReasonConfigDto): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '修改投诉原因文案和排序' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintReasonConfigDto,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '切换投诉原因启用状态' })
  async toggle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.toggle(id);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: '删除投诉原因配置' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<unknown>> {
    const data = await this.complaintReasonConfigService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
