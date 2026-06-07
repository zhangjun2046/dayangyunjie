import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { QueryServiceCatalogDto } from './dto/query-service-catalog.dto';
import { ServiceCatalogService } from './service-catalog.service';

@ApiTags('ServiceCatalogs')
@Controller('service-catalogs')
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

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
}
