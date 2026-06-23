import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintDto, ComplaintFollowUpDto } from '@dayangyunjie/shared';
import { Complaint, ComplaintFollowUp, ComplaintStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

/** 投诉合法状态转移规则（单向不可逆） */
const COMPLAINT_TRANSITION_RULES: Record<string, string[]> = {
  [ComplaintStatus.PENDING]: [ComplaintStatus.PROCESSING],
  [ComplaintStatus.PROCESSING]: [ComplaintStatus.COMPLETED],
  // 终态：COMPLETED — 无可转移目标
};

/** 投诉详情（含 followUps 列表） */
type ComplaintWithFollowUps = Complaint & { followUps: ComplaintFollowUp[] };

@Injectable()
export class ComplaintService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 创建投诉。
   * 校验：对应订单必须存在（保洁/废品/咨询三类均支持）。
   * 不限制订单状态，居民可随时投诉。
   */
  async create(dto: CreateComplaintDto): Promise<ComplaintDto> {
    const { orderType, orderId, reason, description, evidenceImages, residentId } = dto;

    // 验证订单存在
    await this.findOrderOrThrow(orderType, orderId);

    const complaintNo = await this.generateComplaintNo();

    const row = await this.prismaService.complaint.create({
      data: {
        complaintNo,
        orderType,
        reason,
        description,
        ...(evidenceImages ? { evidenceImages: evidenceImages as Prisma.InputJsonValue } : {}),
        ...(residentId ? { residentId } : {}),
        ...(orderType === 'CLEANING' ? { cleaningOrderId: orderId } : {}),
        ...(orderType === 'RECYCLING' ? { recyclingOrderId: orderId } : {}),
        ...(orderType === 'CONSULT' ? { consultOrderId: orderId } : {}),
      },
    });

    console.info(`[Complaint] created id=${row.id} orderType=${orderType} orderId=${orderId} reason=${reason}`);
    return this.toDto(row);
  }

  async findAll(query: QueryComplaintDto) {
    const { page = 1, pageSize = 10, status, orderType, orderId, residentId, workerId } = query;

    const where: Prisma.ComplaintWhereInput = {
      ...(status ? { status } : {}),
      ...(orderType ? { orderType } : {}),
      ...(residentId ? { residentId } : {}),
      ...(orderId && orderType === 'CLEANING' ? { cleaningOrderId: orderId } : {}),
      ...(orderId && orderType === 'RECYCLING' ? { recyclingOrderId: orderId } : {}),
      ...(orderId && orderType === 'CONSULT' ? { consultOrderId: orderId } : {}),
      ...(workerId
        ? {
            OR: [
              { cleaningOrder: { workerId } },
              { recyclingOrder: { workerId } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.complaint.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
      }),
      this.prismaService.complaint.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      total,
      page,
      pageSize,
    };
  }

  /** 查询投诉详情，包含跟进记录列表（followUps） */
  async findOne(id: number): Promise<ComplaintDto & { followUps: ComplaintFollowUpDto[] }> {
    const row = await this.prismaService.complaint.findUnique({
      where: { id },
      include: { followUps: { orderBy: { id: 'asc' } } },
    });
    if (!row) {
      throw new NotFoundException(`Complaint ${id} not found`);
    }
    return {
      ...this.toDto(row),
      followUps: row.followUps.map((f) => this.toFollowUpDto(f)),
    };
  }

  /**
   * 更新投诉状态。
   * 合法路径：PENDING → PROCESSING → COMPLETED（单向不可逆）。
   * 终态 COMPLETED 不可再变更。
   */
  async updateStatus(id: number, dto: UpdateComplaintStatusDto): Promise<ComplaintDto> {
    const complaint = await this.findOneOrThrow(id);
    const fromStatus = complaint.status as string;
    const toStatus = dto.status;

    this.validateComplaintTransition(fromStatus, toStatus);

    await this.prismaService.complaint.update({
      where: { id },
      data: { status: toStatus },
    });

    console.info(`[Complaint] status updated id=${id} ${fromStatus} → ${toStatus} by ${dto.operatorName}`);
    return this.toDto(await this.findOneOrThrow(id));
  }

  /** 为投诉添加跟进记录 */
  async addFollowUp(id: number, dto: CreateFollowUpDto): Promise<ComplaintFollowUpDto> {
    // 确认投诉存在
    await this.findOneOrThrow(id);

    const row = await this.prismaService.complaintFollowUp.create({
      data: {
        complaintId: id,
        handlerName: dto.handlerName,
        content: dto.content,
      },
    });

    console.info(`[Complaint] followUp added complaintId=${id} handler=${dto.handlerName}`);
    return this.toFollowUpDto(row);
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────

  /**
   * 校验投诉状态转移是否合法。
   * @throws BadRequestException 转移非法或已为终态时抛出
   */
  private validateComplaintTransition(fromStatus: string, toStatus: string): void {
    if (fromStatus === ComplaintStatus.COMPLETED) {
      throw new BadRequestException(
        `投诉已处于终态（${ComplaintStatus.COMPLETED}），不可再变更状态`,
      );
    }

    const allowed = COMPLAINT_TRANSITION_RULES[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `非法状态转移：投诉当前状态 ${fromStatus} 不允许变更为 ${toStatus}`,
      );
    }
  }

  /** 生成投诉单编号，格式 CPL{yyyyMMdd}{4位序号} */
  private async generateComplaintNo(): Promise<string> {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = `CPL${datePart}`;
    const last = await this.prismaService.complaint.findFirst({
      where: { complaintNo: { startsWith: prefix } },
      orderBy: { complaintNo: 'desc' },
      select: { complaintNo: true },
    });
    const currentSeq = last ? Number.parseInt(last.complaintNo.slice(-4), 10) : 0;
    const paddedSeq = String(currentSeq + 1).padStart(4, '0');
    return `${prefix}${paddedSeq}`;
  }

  /** 查询投诉（不含 followUps），不存在时抛 404 */
  private async findOneOrThrow(id: number): Promise<Complaint> {
    const row = await this.prismaService.complaint.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Complaint ${id} not found`);
    }
    return row;
  }

  /** 查询关联订单，验证其存在；不存在时抛 404 */
  private async findOrderOrThrow(
    orderType: 'CLEANING' | 'RECYCLING' | 'CONSULT',
    orderId: number,
  ): Promise<void> {
    if (orderType === 'CLEANING') {
      const order = await this.prismaService.cleaningOrder.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException(`CleaningOrder ${orderId} not found`);
      return;
    }
    if (orderType === 'RECYCLING') {
      const order = await this.prismaService.recyclingOrder.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException(`RecyclingOrder ${orderId} not found`);
      return;
    }
    // CONSULT
    const order = await this.prismaService.consultOrder.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException(`ConsultOrder ${orderId} not found`);
  }

  private toDto(row: Complaint): ComplaintDto {
    return {
      id: row.id,
      cleaningOrderId: row.cleaningOrderId ?? null,
      recyclingOrderId: row.recyclingOrderId ?? null,
      consultOrderId: row.consultOrderId ?? null,
      orderType: row.orderType as ComplaintDto['orderType'],
      reason: row.reason as ComplaintDto['reason'],
      description: row.description,
      evidenceImages: row.evidenceImages ? (row.evidenceImages as string[]) : null,
      status: row.status as ComplaintDto['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toFollowUpDto(row: ComplaintFollowUp): ComplaintFollowUpDto {
    return {
      id: row.id,
      complaintId: row.complaintId,
      handlerName: row.handlerName,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
