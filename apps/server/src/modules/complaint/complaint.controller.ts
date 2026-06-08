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
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@ApiTags('Complaints')
@Controller('complaints')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @ApiOperation({
    summary: '提交投诉',
    description:
      '居民对保洁/废品/咨询订单提交投诉，支持上传凭证图片。' +
      '投诉初始状态为 PENDING（待处理）。',
  })
  @ApiOkResponse({ description: '投诉提交成功，返回投诉详情' })
  async create(
    @Body() dto: CreateComplaintDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ComplaintService['create']>>>> {
    const data = await this.complaintService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({
    summary: '分页查询投诉列表',
    description: '支持按 status / orderType 筛选，按 id 倒序返回。不含 followUps 列表（详情接口返回）。',
  })
  @ApiOkResponse({ description: '查询成功，返回分页结果' })
  async findAll(
    @Query() query: QueryComplaintDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ComplaintService['findAll']>>>> {
    const data = await this.complaintService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({
    summary: '查询投诉详情（含跟进记录）',
    description: '按投诉 ID 查询，响应中包含 followUps 列表（所有跟进记录，按 id 升序）。',
  })
  @ApiOkResponse({ description: '查询成功，返回投诉详情及 followUps' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ComplaintService['findOne']>>>> {
    const data = await this.complaintService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '更新投诉状态（管理员操作）',
    description:
      '合法路径：PENDING（待处理）→ PROCESSING（处理中）→ COMPLETED（已结案）。' +
      '单向不可逆，终态 COMPLETED 不可再变更，非法转移返回 HTTP 400。',
  })
  @ApiOkResponse({ description: '状态更新成功，返回最新投诉数据' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ComplaintService['updateStatus']>>>> {
    const data = await this.complaintService.updateStatus(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/follow-ups')
  @ApiOperation({
    summary: '添加投诉跟进记录',
    description: '管理员为处理中的投诉添加跟进记录（handlerName + content），可多次调用。',
  })
  @ApiOkResponse({ description: '跟进记录添加成功，返回新增的跟进记录' })
  async addFollowUp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFollowUpDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ComplaintService['addFollowUp']>>>> {
    const data = await this.complaintService.addFollowUp(id, dto);
    return { code: 0, message: 'ok', data };
  }
}
