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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: '创建地址' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['create']>>>> {
    const data = await this.addressService.create(createAddressDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询地址列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryAddressDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['findAll']>>>> {
    const data = await this.addressService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询地址详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['findOne']>>>> {
    const data = await this.addressService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新地址' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['update']>>>> {
    const data = await this.addressService.update(id, updateAddressDto);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id/default')
  @ApiOperation({ summary: '设置默认地址' })
  @ApiOkResponse({ description: '设置成功' })
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['setDefault']>>>> {
    const data = await this.addressService.setDefault(id);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除地址' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AddressService['remove']>>>> {
    const data = await this.addressService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
