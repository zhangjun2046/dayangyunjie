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
import { CreateWorkerDto } from './dto/create-worker.dto';
import { QueryWorkerDto } from './dto/query-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerService } from './worker.service';

@ApiTags('Workers')
@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post()
  @ApiOperation({ summary: '创建员工' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createWorkerDto: CreateWorkerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<WorkerService['create']>>>> {
    const data = await this.workerService.create(createWorkerDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询员工列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryWorkerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<WorkerService['findAll']>>>> {
    const data = await this.workerService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询员工详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<WorkerService['findOne']>>>> {
    const data = await this.workerService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新员工信息' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<WorkerService['update']>>>> {
    const data = await this.workerService.update(id, updateWorkerDto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除员工' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<WorkerService['remove']>>>> {
    const data = await this.workerService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
