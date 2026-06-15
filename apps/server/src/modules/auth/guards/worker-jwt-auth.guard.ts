import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WorkerJwtAuthGuard extends AuthGuard('worker-jwt') {}
