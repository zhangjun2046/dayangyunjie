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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentAdminDecorator } from '../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminCurrentUser } from '../auth/interfaces/admin-current-user.interface';
import { AdminService } from './admin.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@ApiTags('Admins')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '创建管理后台用户（默认密码 Dyyj123..，仅超级管理员）' })
  @ApiOkResponse({ description: '创建成功' })
  async create(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['create']>>>> {
    const data = await this.adminService.create(createAdminDto);
    return { code: 0, message: 'ok', data };
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '分页查询管理后台用户列表（仅超级管理员）' })
  @ApiOkResponse({ description: '查询成功' })
  async findAll(
    @Query() query: QueryAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['findAll']>>>> {
    const data = await this.adminService.findAll(query);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '查询管理后台用户详情（仅超级管理员）' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['findOne']>>>> {
    const data = await this.adminService.findOne(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '更新管理后台用户信息（用户名不可修改，仅超级管理员）' })
  @ApiOkResponse({ description: '更新成功' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['update']>>>> {
    const data = await this.adminService.update(id, updateAdminDto);
    return { code: 0, message: 'ok', data };
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '删除管理后台用户（仅超级管理员；超级管理员/自身账号禁止）' })
  @ApiOkResponse({ description: '删除成功' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminDecorator() currentAdmin: AdminCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['remove']>>>> {
    const data = await this.adminService.remove(id, currentAdmin.adminId);
    return { code: 0, message: 'ok', data };
  }

  @Patch(':id/toggle-status')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '切换启用/禁用状态（仅超级管理员；超级管理员/自身账号禁止）' })
  @ApiOkResponse({ description: '切换成功' })
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminDecorator() currentAdmin: AdminCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['toggleStatus']>>>> {
    const data = await this.adminService.toggleStatus(id, currentAdmin.adminId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/reset-password')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '重置密码为默认密码 Dyyj123..（仅超级管理员）' })
  @ApiOkResponse({ description: '密码已重置' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['resetPassword']>>>> {
    const data = await this.adminService.resetPassword(id);
    return { code: 0, message: 'ok', data };
  }

  @Put(':id/change-password')
  @ApiOperation({ summary: '当前登录用户自助修改密码（顶栏「修改密码」）' })
  @ApiOkResponse({ description: '密码修改成功' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
    @CurrentAdminDecorator() currentAdmin: AdminCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminService['changePassword']>>>> {
    const data = await this.adminService.changePassword(id, currentAdmin.adminId, dto);
    return { code: 0, message: 'ok', data };
  }
}
