import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminCurrentUser } from '../auth/interfaces/admin-current-user.interface';
import { ALL_MENU_KEYS } from './constants/menu-keys.constant';

export interface AdminPermissionsResult {
  adminId: number;
  isSuperAdmin: boolean;
  menuKeys: string[];
}

@Injectable()
export class AdminPermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 查询某用户的功能授权清单。
   * 超级管理员目标：直接返回全量 menuKey（不查表，不落库）。
   * 非超级管理员目标：本人可查自己；其余情况仅超级管理员调用方可查询。
   */
  async findByAdmin(targetId: number, currentAdmin: AdminCurrentUser): Promise<AdminPermissionsResult> {
    const target = await this.getOrThrow(targetId);

    if (!currentAdmin.isSuperAdmin && currentAdmin.adminId !== targetId) {
      throw new ForbiddenException('无权查询该用户的功能授权');
    }

    if (target.isSuperAdmin) {
      return { adminId: targetId, isSuperAdmin: true, menuKeys: [...ALL_MENU_KEYS] };
    }

    const rows = await this.prismaService.adminPermission.findMany({
      where: { adminId: targetId },
      select: { menuKey: true },
    });
    return { adminId: targetId, isSuperAdmin: false, menuKeys: rows.map((row) => row.menuKey) };
  }

  /**
   * 覆盖保存某用户的功能授权清单（仅超级管理员可调用，见 SuperAdminGuard）。
   * 超级管理员目标：默认全量放行，不写入本表，直接拒绝分配请求。
   */
  async save(targetId: number, menuKeys: string[]): Promise<AdminPermissionsResult> {
    const target = await this.getOrThrow(targetId);
    if (target.isSuperAdmin) {
      throw new BadRequestException('超级管理员权限默认全量，无需分配');
    }

    const uniqueKeys = Array.from(new Set(menuKeys));

    await this.prismaService.$transaction([
      this.prismaService.adminPermission.deleteMany({ where: { adminId: targetId } }),
      this.prismaService.adminPermission.createMany({
        data: uniqueKeys.map((menuKey) => ({ adminId: targetId, menuKey })),
      }),
    ]);

    return { adminId: targetId, isSuperAdmin: false, menuKeys: uniqueKeys };
  }

  private async getOrThrow(id: number) {
    const admin = await this.prismaService.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`Admin ${id} not found`);
    }
    return admin;
  }
}
