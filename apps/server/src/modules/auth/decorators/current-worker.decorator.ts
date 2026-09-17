import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkerCurrentUser } from '../interfaces/worker-current-user.interface';

export const CurrentWorkerDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkerCurrentUser => {
    const request = ctx.switchToHttp().getRequest<{ user: WorkerCurrentUser }>();
    return request.user;
  },
);
