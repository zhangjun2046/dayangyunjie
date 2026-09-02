import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ProgressNodeDto } from '@dayangyunjie/shared';
import { EnvConfigService } from '../config/env-config.service';
import { PrismaService } from '../prisma/prisma.service';

export type ProgressRole = 'RESIDENT' | 'WORKER' | 'ADMIN';
export type ProgressOrderType = 'CLEANING' | 'RECYCLING' | 'CONSULT';

export interface RequestIdentity {
  id: number;
  role: ProgressRole;
}

interface AssembleProgressParams {
  orderId: number;
  orderType: ProgressOrderType;
  currentStatus: string;
  createdAt: Date | string;
  workerName?: string | null;
  role: ProgressRole;
}

interface JwtPayload {
  sub?: number;
  role?: string;
  tokenType?: string;
}

const MAIN_STATUSES = [
  'PENDING_ASSIGN',
  'ASSIGNED',
  'ACCEPTED',
  'IN_SERVICE',
  'PENDING_REVIEW',
  'REVIEWED',
] as const;

const CONSULT_STATUSES = ['FOLLOW_UP', 'FOLLOWING', 'COMPLETED'] as const;

const MAIN_LABELS: Record<string, string> = {
  PENDING_ASSIGN: '已下单',
  ASSIGNED: '已派单',
  ACCEPTED: '已接单',
  IN_SERVICE: '服务中',
  PENDING_REVIEW: '待评价',
  REVIEWED: '已评价',
  CANCELLED: '已取消',
};

const CONSULT_LABELS: Record<string, string> = {
  FOLLOW_UP: '待跟进',
  FOLLOWING: '跟进中',
  COMPLETED: '已完成',
};

const MAIN_MESSAGES: Record<ProgressRole, Record<string, string>> = {
  RESIDENT: {
    PENDING_ASSIGN: '您已下单，等待平台派单',
    ASSIGNED: '系统派单给「{workerName}」',
    ACCEPTED: '{workerName}已接单',
    IN_SERVICE: '{workerName}已上门，开始服务',
    PENDING_REVIEW: '服务已完成，待您评价',
    REVIEWED: '您已完成评价',
    CANCELLED: '订单已取消',
  },
  WORKER: {
    PENDING_ASSIGN: '用户已下单，等待平台派单',
    ASSIGNED: '系统派单给了您',
    ACCEPTED: '您已接单',
    IN_SERVICE: '您已上门，开始服务',
    PENDING_REVIEW: '您已完成服务，等待用户评价',
    REVIEWED: '用户已完成评价',
    CANCELLED: '订单已取消',
  },
  ADMIN: {
    PENDING_ASSIGN: '居民已下单，待派单',
    ASSIGNED: '已派单给「{workerName}」',
    ACCEPTED: '{workerName}已接单',
    IN_SERVICE: '{workerName}已上门，服务进行中',
    PENDING_REVIEW: '服务已完成，待居民评价',
    REVIEWED: '居民已评价',
    CANCELLED: '订单已取消',
  },
};

const CONSULT_MESSAGES: Record<string, string> = {
  FOLLOW_UP: '您已提交咨询，等待平台跟进',
  FOLLOWING: '运营人员正在跟进中',
  COMPLETED: '咨询已完成',
};

const AUTH_EXPIRED_MESSAGE = '登录已过期，请重新登录';

@Injectable()
export class OrderProgressService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly envConfigService: EnvConfigService,
  ) {}

  async resolveIdentity(authorization?: string): Promise<RequestIdentity | null> {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.envConfigService.jwtAccessSecret,
      });
      if (payload.tokenType !== 'access' || !payload.sub) {
        throw new UnauthorizedException(AUTH_EXPIRED_MESSAGE);
      }
      const role = this.normalizeRole(payload.role);
      if (!role) {
        throw new UnauthorizedException(AUTH_EXPIRED_MESSAGE);
      }
      return { id: payload.sub, role };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(AUTH_EXPIRED_MESSAGE);
    }
  }

  async resolveCreateActor(
    authorization: string | undefined,
    residentId?: number,
  ): Promise<RequestIdentity | null> {
    const identity = await this.resolveIdentity(authorization);
    if (identity?.role === 'ADMIN' || identity?.role === 'RESIDENT') {
      return identity;
    }
    return residentId ? { id: residentId, role: 'RESIDENT' } : null;
  }

  async assemble(params: AssembleProgressParams): Promise<ProgressNodeDto[]> {
    const logs = await this.prismaService.orderStatusLog.findMany({
      where: { orderId: params.orderId, orderType: params.orderType },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const reachedAt = new Map<string, Date>();
    for (const log of logs) {
      if (!reachedAt.has(log.toStatus)) reachedAt.set(log.toStatus, log.createdAt);
    }

    const createdAt =
      params.createdAt instanceof Date ? params.createdAt : new Date(params.createdAt);

    if (params.orderType === 'CONSULT') {
      if (params.role !== 'RESIDENT') return [];
      if (!reachedAt.has('FOLLOW_UP')) reachedAt.set('FOLLOW_UP', createdAt);
      return this.buildNodes(
        CONSULT_STATUSES,
        params.currentStatus,
        reachedAt,
        CONSULT_LABELS,
        (status) => CONSULT_MESSAGES[status] ?? null,
      );
    }

    if (!reachedAt.has('PENDING_ASSIGN')) reachedAt.set('PENDING_ASSIGN', createdAt);
    const workerName = params.workerName || '服务人员';
    const messageFor = (status: string) =>
      (MAIN_MESSAGES[params.role][status] ?? '').replaceAll('{workerName}', workerName) || null;

    if (params.currentStatus === 'CANCELLED') {
      return [
        {
          status: 'PENDING_ASSIGN',
          label: MAIN_LABELS.PENDING_ASSIGN,
          state: 'done',
          message: messageFor('PENDING_ASSIGN'),
          operatedAt: reachedAt.get('PENDING_ASSIGN')?.toISOString() ?? null,
        },
        {
          status: 'CANCELLED',
          label: MAIN_LABELS.CANCELLED,
          state: 'current',
          message: messageFor('CANCELLED'),
          operatedAt: reachedAt.get('CANCELLED')?.toISOString() ?? null,
        },
      ];
    }

    const nodes = this.buildNodes(
      MAIN_STATUSES,
      params.currentStatus,
      reachedAt,
      MAIN_LABELS,
      messageFor,
    );
    const reassignLogs = logs.filter(
      (log) => log.fromStatus === 'ASSIGNED' && log.toStatus === 'ASSIGNED',
    );
    const assignedNode = nodes.find((node) => node.status === 'ASSIGNED');
    if (reassignLogs.length > 0 && assignedNode && assignedNode.state !== 'pending') {
      if (params.role === 'ADMIN') {
        const assignedIndex = nodes.indexOf(assignedNode);
        const assignedWasCurrent = assignedNode.state === 'current';
        assignedNode.message = '订单已完成首次派单';
        if (assignedWasCurrent) assignedNode.state = 'done';

        const reassignNodes: ProgressNodeDto[] = reassignLogs.map((log, index) => ({
          eventKey: `reassign-${log.id}`,
          status: 'ASSIGNED',
          label: '已改派',
          state:
            assignedWasCurrent && index === reassignLogs.length - 1
              ? 'current'
              : 'done',
          message: log.remark || '管理员已改派服务人员',
          operatedAt: log.createdAt.toISOString(),
        }));
        nodes.splice(assignedIndex + 1, 0, ...reassignNodes);
      } else {
        const latestReassignLog = reassignLogs[reassignLogs.length - 1];
        assignedNode.operatedAt = latestReassignLog.createdAt.toISOString();
      }
    }
    return nodes;
  }

  private buildNodes(
    statuses: readonly string[],
    currentStatus: string,
    reachedAt: Map<string, Date>,
    labels: Record<string, string>,
    messageFor: (status: string) => string | null,
  ): ProgressNodeDto[] {
    const currentIndex = statuses.indexOf(currentStatus);
    return statuses.map((status, index) => {
      const state: ProgressNodeDto['state'] =
        index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending';
      return {
        status,
        label: labels[status] ?? status,
        state,
        message: state === 'pending' ? null : messageFor(status),
        operatedAt: state === 'pending' ? null : reachedAt.get(status)?.toISOString() ?? null,
      };
    });
  }

  private normalizeRole(role?: string): ProgressRole | null {
    const normalized = role?.toUpperCase();
    return normalized === 'RESIDENT' || normalized === 'WORKER' || normalized === 'ADMIN'
      ? normalized
      : null;
  }
}
