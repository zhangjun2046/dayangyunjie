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
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admins')
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: '创建管理员' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['create']>>>> {
    const data = await this.adminService.create(createAdminDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @ApiOperation({ summary: '分页查询管理员列表' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['findAll']>>>> {
    const data = await this.adminService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询管理员详情' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['findOne']>>>> {
    const data = await this.adminService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新管理员信息' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['update']>>>> {
    const data = await this.adminService.update(id, updateAdminDto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除管理员' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['remove']>>>> {
    const data = await this.adminService.remove(id);
    return { code: 0, message: 'ok', data };
  }
}
