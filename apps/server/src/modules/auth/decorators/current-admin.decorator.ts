import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminCurrentUser } from '../interfaces/admin-current-user.interface';

export const CurrentAdminDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminCurrentUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AdminCurrentUser }>();
    return request.user;
  },
);
