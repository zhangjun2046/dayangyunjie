import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Worker } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { QueryWorkerDto } from './dto/query-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Injectable()
export class WorkerService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createWorkerDto: CreateWorkerDto) {
    const { password, skillCertUrls, skillCertUrl, ...rest } = createWorkerDto;
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedSkillCertUrls = this.normalizeSkillCertUrls(
      skillCertUrls,
      skillCertUrl,
    );

    try {
      const worker = await this.prismaService.worker.create({
        data: {
          ...rest,
          passwordHash,
          ...(normalizedSkillCertUrls !== undefined
            ? {
                skillCertUrls: normalizedSkillCertUrls as Prisma.InputJsonValue,
                skillCertUrl: normalizedSkillCertUrls[0] ?? null,
              }
            : {}),
        },
      });
      return this.toPublicWorker(worker);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(query: QueryWorkerDto) {
    const { page = 1, pageSize = 10, name, phone, status, employmentStatus, skillType } = query;
    const where: Prisma.WorkerWhereInput = {
      ...(name ? { name: { contains: name } } : {}),
      ...(phone ? { phone: { contains: phone } } : {}),
      ...(status ? { status } : {}),
      ...(employmentStatus ? { employmentStatus } : {}),
      ...(skillType ? { skillType } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.worker.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      this.prismaService.worker.count({ where }),
    ]);

    const workerIds = items.map((w) => w.id);
    const statsMap = await this.getStatsForWorkers(workerIds);

    return {
      items: items.map((item) => ({
        ...this.toPublicWorker(item),
        ...statsMap.get(item.id),
      })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }
    const stats = (await this.getStatsForWorkers([id])).get(id);
    return {
      ...this.toPublicWorker(worker),
      ...stats,
    };
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto) {
    await this.findOne(id);
    const { password, skillCertUrls, skillCertUrl, ...rest } = updateWorkerDto;
    const data: Prisma.WorkerUpdateInput = { ...rest };
    const normalizedSkillCertUrls = this.normalizeSkillCertUrls(
      skillCertUrls,
      skillCertUrl,
    );

    if (normalizedSkillCertUrls !== undefined) {
      data.skillCertUrls = normalizedSkillCertUrls as Prisma.InputJsonValue;
      // 同步首张到旧字段，保障尚未升级的客户端仍可展示技能证书。
      data.skillCertUrl = normalizedSkillCertUrls[0] ?? null;
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const worker = await this.prismaService.worker.update({
        where: { id },
        data,
      });
      return this.toPublicWorker(worker);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prismaService.worker.delete({ where: { id } });
    return { id };
  }

  async changePassword(id: number, oldPassword: string, newPassword: string) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }

    const isMatch = await bcrypt.compare(oldPassword, worker.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('旧密码不正确');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.prismaService.worker.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicWorker(updated);
  }

  async resetPassword(id: number) {
    const worker = await this.prismaService.worker.findUnique({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker ${id} not found`);
    }

    const passwordHash = await bcrypt.hash(worker.phone, 10);
    const updated = await this.prismaService.worker.update({
      where: { id },
      data: { passwordHash },
    });
    return this.toPublicWorker(updated);
  }

  private toPublicWorker(worker: Worker) {
    const { passwordHash, ...rest } = worker;
    return {
      ...rest,
      skillCertUrls: this.normalizeSkillCertUrls(
        this.toStringArray(worker.skillCertUrls),
        worker.skillCertUrl,
      ) ?? [],
    };
  }

  /**
   * 统一新旧技能证书字段。
   * 数组字段优先；未传数组时回退到旧单图字段，空字符串按无证书处理。
   */
  private normalizeSkillCertUrls(
    skillCertUrls?: string[],
    legacySkillCertUrl?: string | null,
  ): string[] | undefined {
    if (skillCertUrls !== undefined) {
      return skillCertUrls.filter((url) => url.trim().length > 0);
    }
    if (legacySkillCertUrl?.trim()) {
      return [legacySkillCertUrl];
    }
    return legacySkillCertUrl === null || legacySkillCertUrl === ''
      ? []
      : undefined;
  }

  /** Prisma JsonValue 安全转换为字符串数组，忽略异常历史值。 */
  private toStringArray(value: Prisma.JsonValue | null): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private async getStatsForWorkers(workerIds: number[]) {
    const result = new Map<
      number,
      {
        todayOrders: number;
        pendingOrders: number;
        completedOrders: number;
        acceptedOrders: number;
        completionRate: number | null;
      }
    >();
    for (const workerId of workerIds) {
      result.set(workerId, {
        todayOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        acceptedOrders: 0,
        completionRate: null,
      });
    }
    if (workerIds.length === 0) return result;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const [logs, cleaningOrders, recyclingOrders] = await this.prismaService.$transaction([
      this.prismaService.orderStatusLog.findMany({
        where: {
          orderType: { in: ['CLEANING', 'RECYCLING'] },
          toStatus: 'PENDING_REVIEW',
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        select: { orderId: true, orderType: true },
      }),
      this.prismaService.cleaningOrder.findMany({
        where: { workerId: { in: workerIds } },
        select: { id: true, workerId: true, status: true },
      }),
      this.prismaService.recyclingOrder.findMany({
        where: { workerId: { in: workerIds } },
        select: { id: true, workerId: true, status: true },
      }),
    ]);

    const completedToday = new Set(
      logs.map((log) => `${log.orderType}:${log.orderId}`),
    );
    const acceptedStatuses = new Set([
      'ACCEPTED',
      'IN_SERVICE',
      'PENDING_REVIEW',
      'REVIEWED',
    ]);
    const pendingStatuses = new Set(['ACCEPTED', 'IN_SERVICE']);
    const completedStatuses = new Set(['PENDING_REVIEW', 'REVIEWED']);

    for (const [orderType, orders] of [
      ['CLEANING', cleaningOrders],
      ['RECYCLING', recyclingOrders],
    ] as const) {
      for (const order of orders) {
        if (!order.workerId) continue;
        const stats = result.get(order.workerId);
        if (!stats) continue;
        if (acceptedStatuses.has(order.status)) stats.acceptedOrders += 1;
        if (pendingStatuses.has(order.status)) stats.pendingOrders += 1;
        if (completedStatuses.has(order.status)) stats.completedOrders += 1;
        if (completedToday.has(`${orderType}:${order.id}`)) stats.todayOrders += 1;
      }
    }

    for (const stats of result.values()) {
      stats.completionRate =
        stats.acceptedOrders === 0
          ? null
          : Math.round((stats.completedOrders / stats.acceptedOrders) * 100);
    }
    return result;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Worker unique field already exists');
    }
    throw error;
  }
}
