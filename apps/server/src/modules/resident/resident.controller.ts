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
import { CreateResidentDto } from './dto/create-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { ResidentService } from './resident.service';

@ApiTags('Residents')
@Controller('residents')
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @ApiOperation({ summary: '创建居民' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createResidentDto: CreateResidentDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ResidentService['create']>>>> {
    const data = await this.residentService.create(createResidentDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询居民列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryResidentDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ResidentService['findAll']>>>> {
    const data = await this.residentService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询居民详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ResidentService['findOne']>>>> {
    const data = await this.residentService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新居民信息' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResidentDto: UpdateResidentDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ResidentService['update']>>>> {
    const data = await this.residentService.update(id, updateResidentDto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除居民' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ResidentService['remove']>>>> {
    const data = await this.residentService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
