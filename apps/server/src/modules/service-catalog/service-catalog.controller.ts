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
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { CreateServiceCatalogDto } from './dto/create-service-catalog.dto';
import { QueryServiceCatalogDto } from './dto/query-service-catalog.dto';
import { UpdateServiceCatalogDto } from './dto/update-service-catalog.dto';
import { ServiceCatalogService } from './service-catalog.service';

@ApiTags('ServiceCatalogs')
@Controller('service-catalogs')
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Post()
  @ApiOperation({ summary: '新增服务目录' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() dto: CreateServiceCatalogDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['create']>>>> {
    const data = await this.serviceCatalogService.create(dto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询服务目录列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryServiceCatalogDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['findAll']>>>> {
    const data = await this.serviceCatalogService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询服务目录详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['findOne']>>>> {
    const data = await this.serviceCatalogService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑服务目录' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceCatalogDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['update']>>>> {
    const data = await this.serviceCatalogService.update(id, dto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除服务目录' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['remove']>>>> {
    const data = await this.serviceCatalogService.remove(id);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '切换服务目录启用/停用状态' })
  @ApiOkResponse({ description: '切换成功' })
  async toggle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<ServiceCatalogService['toggle']>>>> {
    const data = await this.serviceCatalogService.toggle(id);
    return { code: 0, message: 'ok', data };
  }
}
