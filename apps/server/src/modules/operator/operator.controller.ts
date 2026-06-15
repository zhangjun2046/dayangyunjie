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
import { CreateOperatorDto } from './dto/create-operator.dto';
import { QueryOperatorDto } from './dto/query-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { OperatorService } from './operator.service';

@ApiTags('Operators')
@Controller('operators')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post()
  @ApiOperation({ summary: '新增运营人员' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() dto: CreateOperatorDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['create']>>>> {
    const data = await this.operatorService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询运营人员列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryOperatorDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['findAll']>>>> {
    const data = await this.operatorService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  /**
   * 必须在 GET :id 之前声明，防止 Express 将 'contact' 匹配为 :id
   */
  @Get('contact')
  @ApiOperation({ summary: '获取接单运营人员联系方式（供居民端首页使用）' })
  @ApiOkResponse({ description: '查询成功' })
  async findContact(): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['findContact']>>>> {
    const data = await this.operatorService.findContact();
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询运营人员详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['findOne']>>>> {
    const data = await this.operatorService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑运营人员' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperatorDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['update']>>>> {
    const data = await this.operatorService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除运营人员' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<OperatorService['remove']>>>> {
    const data = await this.operatorService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
