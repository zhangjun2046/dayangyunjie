import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewDto } from '@dayangyunjie/shared';
import { Prisma, Review } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stateMachine: OrderStateMachineService,
  ) {}

  /**
   * 创建评价。
   * 校验规则：
   *  1. 对应订单必须存在且状态为 PENDING_REVIEW
   *  2. 同一订单不能重复评价（one-to-one 约束）
   * 副作用：在事务中将订单状态转移至 REVIEWED，并写入审计日志。
   */
  async create(dto: CreateReviewDto): Promise<ReviewDto> {
    const { orderType, orderId, residentId, rating, tags, content, images } = dto;

    // 查询对应订单
    const order = await this.findOrderOrThrow(orderType, orderId);

    // 校验订单状态必须为 PENDING_REVIEW
    if (order.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `当前订单状态为 ${order.status}，只有处于 PENDING_REVIEW 状态的订单才可提交评价`,
      );
    }

    // 检查是否已有评价（数据库层有 unique 约束，这里提前提示）
    const existing = await this.prismaService.review.findFirst({
      where: orderType === 'CLEANING'
        ? { cleaningOrderId: orderId }
        : { recyclingOrderId: orderId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(`该订单已存在评价，不可重复提交`);
    }

    const row = await this.prismaService.$transaction(async (tx) => {
      // 创建评价记录
      const review = await tx.review.create({
        data: {
          orderType,
          rating,
          tags: tags as Prisma.InputJsonValue,
          content: content ?? null,
          ...(images ? { images: images as Prisma.InputJsonValue } : {}),
          ...(orderType === 'CLEANING'
            ? { cleaningOrderId: orderId }
            : { recyclingOrderId: orderId }),
        },
      });

      // 驱动订单状态 PENDING_REVIEW → REVIEWED
      await this.stateMachine.transition(tx, {
        orderId,
        orderType,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REVIEWED',
        operatorId: residentId,
        operatorType: 'RESIDENT',
      });

      return review;
    });

    console.info(`[Review] created id=${row.id} orderType=${orderType} orderId=${orderId} rating=${rating}`);
    return this.toDto(row);
  }

  async findAll(query: QueryReviewDto) {
    const { page = 1, pageSize = 10, orderType, orderId } = query;

    const where: Record<string, unknown> = {};
    if (orderType) {
      where.orderType = orderType;
    }
    if (orderId !== undefined) {
      if (orderType === 'CLEANING') {
        where.cleaningOrderId = orderId;
      } else if (orderType === 'RECYCLING') {
        where.recyclingOrderId = orderId;
      } else {
        // 未指定 orderType 时按两个外键 OR 查询
        where.OR = [{ cleaningOrderId: orderId }, { recyclingOrderId: orderId }];
      }
    }

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.review.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
      }),
      this.prismaService.review.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number): Promise<ReviewDto> {
    const row = await this.prismaService.review.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    return this.toDto(row);
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────

  /** 查询订单（保洁或废品），不存在时抛 404 */
  private async findOrderOrThrow(
    orderType: 'CLEANING' | 'RECYCLING',
    orderId: number,
  ): Promise<{ id: number; status: string }> {
    if (orderType === 'CLEANING') {
      const order = await this.prismaService.cleaningOrder.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      if (!order) {
        throw new NotFoundException(`CleaningOrder ${orderId} not found`);
      }
      return order;
    }

    const order = await this.prismaService.recyclingOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(`RecyclingOrder ${orderId} not found`);
    }
    return order;
  }

  private toDto(row: Review): ReviewDto {
    return {
      id: row.id,
      cleaningOrderId: row.cleaningOrderId ?? null,
      recyclingOrderId: row.recyclingOrderId ?? null,
      orderType: row.orderType as ReviewDto['orderType'],
      rating: row.rating,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      content: row.content ?? null,
      images: row.images ? (row.images as string[]) : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
