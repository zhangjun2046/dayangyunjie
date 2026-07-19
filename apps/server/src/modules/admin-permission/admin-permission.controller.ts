import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentAdminDecorator } from '../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminCurrentUser } from '../auth/interfaces/admin-current-user.interface';
import { AdminPermissionService } from './admin-permission.service';
import { SetAdminPermissionsDto } from './dto/set-admin-permissions.dto';

@ApiTags('AdminPermissions')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admins/:id/permissions')
export class AdminPermissionController {
  constructor(private readonly adminPermissionService: AdminPermissionService) {}

  @Get()
  @ApiOperation({ summary: '查询用户功能授权清单（本人可查自己，超级管理员可查任何人）' })
  @ApiOkResponse({ description: '查询成功' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdminDecorator() currentAdmin: AdminCurrentUser,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminPermissionService['findByAdmin']>>>> {
    const data = await this.adminPermissionService.findByAdmin(id, currentAdmin);
    return { code: 0, message: 'ok', data };
  }

  @Put()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: '覆盖保存用户功能授权清单（仅超级管理员）' })
  @ApiOkResponse({ description: '保存成功' })
  async save(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetAdminPermissionsDto,
  ): Promise<ApiResponseDto<Awaited<ReturnType<AdminPermissionService['save']>>>> {
    const data = await this.adminPermissionService.save(id, dto.menuKeys);
    return { code: 0, message: 'ok', data };
  }
}
