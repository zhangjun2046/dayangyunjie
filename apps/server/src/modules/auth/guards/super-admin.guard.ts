import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AdminCurrentUser } from '../interfaces/admin-current-user.interface';

/**
 * 系统管理-用户管理涉及账号安全操作（编辑他人资料/重置密码/启用禁用/删除），
 * 必须在 AdminJwtAuthGuard 之后使用，仅允许超级管理员访问。
 * 自助改密（change-password）不受此限制，任意管理员均可修改自己的密码。
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: AdminCurrentUser }>();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('仅超级管理员可执行该操作');
    }
    return true;
  }
}
