import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsultOrderDto } from '@dayangyunjie/shared';
import { ConsultOrder, ConsultStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateConsultOrderDto } from './dto/create-consult-order.dto';
import { QueryConsultOrderDto } from './dto/query-consult-order.dto';
import { UpdateConsultStatusDto } from './dto/update-consult-status.dto';

const ORDER_NO_PREFIX = 'CNS';
const ORDER_NO_SEQ_LENGTH = 6;
const ORDER_NO_RETRY_TIMES = 3;

/**
 * 咨询单合法状态转移规则（v2.0：FOLLOW_UP → FOLLOWING → COMPLETED）
 * 单向流转，无取消态
 */
const CONSULT_TRANSITION_RULES: Record<string, string[]> = {
  [ConsultStatus.FOLLOW_UP]: [ConsultStatus.FOLLOWING],
  [ConsultStatus.FOLLOWING]: [ConsultStatus.COMPLETED],
  // 终态：COMPLETED — 无可转移目标
};

@Injectable()
export class ConsultOrderService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateConsultOrderDto): Promise<ConsultOrderDto> {
    if (dto.residentId !== undefined) {
      const resident = await this.prismaService.resident.findUnique({
        where: { id: dto.residentId },
        select: { id: true },
      });
      if (!resident) {
        throw new NotFoundException(`Resident ${dto.residentId} not found`);
      }
    }

    for (let attempt = 0; attempt < ORDER_NO_RETRY_TIMES; attempt += 1) {
      try {
        const row = await this.prismaService.$transaction(async (tx) => {
          const orderNo = await this.generateOrderNo(tx);
          return tx.consultOrder.create({
            data: {
              orderNo,
              serviceType: dto.serviceType,
              contactName: dto.contactName,
              contactPhone: dto.contactPhone,
              requirementDesc: dto.requirementDesc,
              ...(dto.residentId !== undefined ? { residentId: dto.residentId } : {}),
            },
          });
        });

        console.info(`[ConsultOrder] created orderNo=${row.orderNo} residentId=${row.residentId ?? 'anonymous'}`);
        return this.toDto(row);
      } catch (error) {
        if (this.isOrderNoConflict(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Failed to generate unique order number');
  }

  async findAll(query: QueryConsultOrderDto) {
    const { page = 1, pageSize = 10, status, serviceType, keyword } = query;

    const where: Prisma.ConsultOrderWhereInput = {
      ...(status ? { status } : {}),
      ...(serviceType ? { serviceType: { contains: serviceType } } : {}),
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword } },
              { contactName: { contains: keyword } },
              { contactPhone: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.consultOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
      }),
      this.prismaService.consultOrder.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number): Promise<ConsultOrderDto> {
    const row = await this.findOneOrThrow(id);
    return this.toDto(row);
  }

  /**
   * 更新咨询单状态。
   * 合法路径：FOLLOW_UP → FOLLOWING → COMPLETED（不可逆，无取消）
   * 非法转移抛出 HTTP 400；写入 order_status_logs 审计记录。
   */
  async updateStatus(id: number, dto: UpdateConsultStatusDto): Promise<ConsultOrderDto> {
    const order = await this.findOneOrThrow(id);
    const { status: toStatus, operatorId, remark } = dto;
    const fromStatus = order.status as string;

    this.validateConsultTransition(fromStatus, toStatus);

    await this.prismaService.$transaction(async (tx) => {
      await tx.consultOrder.update({
        where: { id },
        data: { status: toStatus },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          orderType: 'CONSULT',
          fromStatus,
          toStatus,
          operatorId,
          operatorType: 'ADMIN',
          remark: remark ?? null,
        },
      });
    });

    console.info(`[ConsultOrder] status updated id=${id} ${fromStatus} → ${toStatus} by admin=${operatorId}`);
    return this.toDto(await this.findOneOrThrow(id));
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────

  /**
   * 校验咨询单状态转移是否合法。
   * @throws BadRequestException 转移非法时抛出
   */
  private validateConsultTransition(fromStatus: string, toStatus: string): void {
    if (fromStatus === ConsultStatus.COMPLETED) {
      throw new BadRequestException(
        `当前咨询单已处于终态（${ConsultStatus.COMPLETED}），不可再变更状态`,
      );
    }

    const allowed = CONSULT_TRANSITION_RULES[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `非法状态转移：当前状态 ${fromStatus} 不允许变更为 ${toStatus}`,
      );
    }
  }

  private async findOneOrThrow(id: number): Promise<ConsultOrder> {
    const row = await this.prismaService.consultOrder.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`ConsultOrder ${id} not found`);
    }
    return row;
  }

  private async generateOrderNo(tx: Prisma.TransactionClient): Promise<string> {
    const datePart = this.formatDatePart(new Date());
    const prefix = `${ORDER_NO_PREFIX}${datePart}`;
    const lastOrder = await tx.consultOrder.findFirst({
      where: { orderNo: { startsWith: prefix } },
      orderBy: { orderNo: 'desc' },
      select: { orderNo: true },
    });

    const currentSeq = lastOrder ? Number.parseInt(lastOrder.orderNo.slice(-ORDER_NO_SEQ_LENGTH), 10) : 0;
    const nextSeq = currentSeq + 1;
    const paddedSeq = String(nextSeq).padStart(ORDER_NO_SEQ_LENGTH, '0');
    return `${prefix}${paddedSeq}`;
  }

  private formatDatePart(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private toDto(row: ConsultOrder): ConsultOrderDto {
    return {
      id: row.id,
      orderNo: row.orderNo,
      residentId: row.residentId ?? undefined,
      serviceType: row.serviceType,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      requirementDesc: row.requirementDesc,
      status: row.status as ConsultOrderDto['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private isOrderNoConflict(error: unknown): boolean {
    const targets =
      error instanceof Prisma.PrismaClientKnownRequestError && Array.isArray(error.meta?.target)
        ? error.meta.target
        : [];
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (targets.includes('orderNo') || targets.includes('order_no'))
    );
  }
}
