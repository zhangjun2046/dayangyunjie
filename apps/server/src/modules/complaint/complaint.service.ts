import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplaintDto,
  ComplaintFollowUpDto,
  ComplaintReasonSnapshot,
} from '@dayangyunjie/shared';
import { Complaint, ComplaintFollowUp, ComplaintStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import {
  encodeCompletionRemark,
  parseCompletionRemark,
} from '../../common/completion-record';

export interface CompletionRecordDto {
  handlerName: string;
  content: string;
  completedAt: string;
}

/** 投诉合法状态转移规则（单向不可逆） */
const COMPLAINT_TRANSITION_RULES: Record<string, string[]> = {
  [ComplaintStatus.PENDING]: [ComplaintStatus.PROCESSING],
  [ComplaintStatus.PROCESSING]: [ComplaintStatus.COMPLETED],
  // 终态：COMPLETED — 无可转移目标
};

/** 关联订单查询字段（列表 + 详情通用） */
const COMPLAINT_RELATIONS_INCLUDE = {
  cleaningOrder: {
    select: {
      orderNo: true,
      contactName: true,
      contactPhone: true,
      serviceItem: true,
      addressSnapshot: true,
      isProxyOrder: true,
      serviceContactName: true,
      serviceContactPhone: true,
      source: true,
      remark: true,
      appointDate: true,
      appointTimeSlot: true,
    },
  },
  recyclingOrder: {
    select: {
      orderNo: true,
      contactName: true,
      contactPhone: true,
      itemType: true,
      addressSnapshot: true,
      isProxyOrder: true,
      serviceContactName: true,
      serviceContactPhone: true,
      source: true,
      remark: true,
      appointDate: true,
      appointTimeSlot: true,
    },
  },
  consultOrder: {
    select: {
      orderNo: true,
      contactName: true,
      contactPhone: true,
      serviceType: true,
      serviceAddress: true,
      requirementDesc: true,
      isProxyOrder: true,
      serviceContactName: true,
      serviceContactPhone: true,
      source: true,
      remark: true,
    },
  },
  resident: { select: { name: true, phone: true } },
} as const;

/** 包含关联订单和居民信息的投诉对象 */
type ComplaintWithRelations = Prisma.ComplaintGetPayload<{
  include: typeof COMPLAINT_RELATIONS_INCLUDE;
}>;

/** 管理端投诉富 DTO（含关联订单展开字段） */
export interface ComplaintRichDto extends ComplaintDto {
  complaintNo: string;
  orderNo: string | null;
  serviceType: string | null;
  serviceAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  isProxyOrder: boolean;
  serviceContactName: string | null;
  serviceContactPhone: string | null;
  orderSource: string | null;
  remark: string | null;
}

/** 含跟进记录的管理端投诉详情 */
export type ComplaintDetailDto = ComplaintRichDto & {
  followUps: ComplaintFollowUpDto[];
  completionRecord?: CompletionRecordDto | null;
};

@Injectable()
export class ComplaintService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 创建投诉。
   * 校验：对应订单必须存在（保洁/废品/咨询三类均支持）。
   * 不限制订单状态，居民可随时投诉。
   */
  async create(dto: CreateComplaintDto): Promise<ComplaintDto> {
    const { orderType, orderId, reasonConfigIds, description, evidenceImages, residentId } = dto;
    const uniqueReasonIds = [...new Set(reasonConfigIds)];

    // 验证订单存在
    await this.findOrderOrThrow(orderType, orderId);
    const complaintNo = await this.generateComplaintNo();

    // 配置读取与投诉快照写入必须处于同一事务，避免并发删除或修改造成文案不一致。
    const row = await this.prismaService.$transaction(async (transaction) => {
      const reasonConfigs = await transaction.complaintReasonConfig.findMany({
        where: { id: { in: uniqueReasonIds } },
        select: { id: true, label: true, isEnabled: true },
      });

      const configById = new Map(reasonConfigs.map((config) => [config.id, config]));
      const missingId = uniqueReasonIds.find((id) => !configById.has(id));
      if (missingId !== undefined) {
        throw this.complaintReasonNotFound(missingId);
      }
      const disabled = reasonConfigs.find((config) => !config.isEnabled);
      if (disabled) {
        throw new BadRequestException(`投诉原因「${disabled.label}」当前已停用，请重新选择`);
      }

      // 按提交顺序落快照，保证展示顺序与居民勾选顺序一致
      const reasons: ComplaintReasonSnapshot[] = uniqueReasonIds.map((id) => {
        const config = configById.get(id)!;
        return { configId: config.id, label: config.label };
      });

      return transaction.complaint.create({
        data: {
          complaintNo,
          orderType,
          reasons: reasons as unknown as Prisma.InputJsonValue,
          description,
          ...(evidenceImages ? { evidenceImages: evidenceImages as Prisma.InputJsonValue } : {}),
          ...(residentId ? { residentId } : {}),
          ...(orderType === 'CLEANING' ? { cleaningOrderId: orderId } : {}),
          ...(orderType === 'RECYCLING' ? { recyclingOrderId: orderId } : {}),
          ...(orderType === 'CONSULT' ? { consultOrderId: orderId } : {}),
        },
      });
    });

    console.info(
      `[Complaint] created id=${row.id} orderType=${orderType} orderId=${orderId} reasonConfigIds=${JSON.stringify(uniqueReasonIds)}`,
    );
    return this.toDto(row);
  }

  async findAll(query: QueryComplaintDto) {
    const { page = 1, pageSize = 10, status, orderType, orderId, residentId, workerId, keyword, contactPhone } = query;

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
      ...(keyword
        ? {
            OR: [
              { complaintNo: { startsWith: keyword } },
              { description: { contains: keyword } },
              { cleaningOrder: { OR: [{ contactName: { contains: keyword } }] } },
              { recyclingOrder: { OR: [{ contactName: { contains: keyword } }] } },
              { consultOrder: { OR: [{ contactName: { contains: keyword } }, { serviceAddress: { contains: keyword } }] } },
            ],
          }
        : {}),
      ...(contactPhone
        ? {
            OR: [
              { cleaningOrder: { contactPhone: { contains: contactPhone } } },
              { recyclingOrder: { contactPhone: { contains: contactPhone } } },
              { consultOrder: { contactPhone: { contains: contactPhone } } },
              { resident: { phone: { contains: contactPhone } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prismaService.complaint.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
        include: COMPLAINT_RELATIONS_INCLUDE,
      }),
      this.prismaService.complaint.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toRichDto(r)),
      total,
      page,
      pageSize,
    };
  }

  /** 查询投诉详情，包含跟进记录列表（followUps） */
  async findOne(id: number): Promise<ComplaintDetailDto> {
    const row = await this.prismaService.complaint.findUnique({
      where: { id },
      include: {
        ...COMPLAINT_RELATIONS_INCLUDE,
        followUps: { orderBy: { id: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Complaint ${id} not found`);
    }
    const completionRecord = await this.loadCompletionRecord(id);
    return {
      ...this.toRichDto(row),
      followUps: row.followUps.map((f) => this.toFollowUpDto(f)),
      completionRecord,
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

    const remark =
      toStatus === ComplaintStatus.COMPLETED && dto.remark?.trim()
        ? encodeCompletionRemark(dto.operatorName, dto.remark.trim())
        : dto.remark?.trim() ?? null;

    await this.prismaService.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: { status: toStatus },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          orderType: 'COMPLAINT',
          fromStatus,
          toStatus,
          operatorId: 1,
          operatorType: 'ADMIN',
          remark,
        },
      });
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

  private async loadCompletionRecord(complaintId: number): Promise<CompletionRecordDto | null> {
    const log = await this.prismaService.orderStatusLog.findFirst({
      where: { orderId: complaintId, orderType: 'COMPLAINT', toStatus: ComplaintStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
    });
    if (!log) return null;
    const parsed = parseCompletionRemark(log.remark);
    if (!parsed) return null;
    return {
      handlerName: parsed.handlerName,
      content: parsed.content,
      completedAt: log.createdAt.toISOString(),
    };
  }

  private complaintReasonNotFound(id: number): NotFoundException {
    return new NotFoundException(`投诉原因（ID: ${id}）不存在`);
  }

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

  private toDto(row: Complaint): ComplaintDto & { complaintNo: string } {
    return {
      id: row.id,
      complaintNo: row.complaintNo,
      cleaningOrderId: row.cleaningOrderId ?? null,
      recyclingOrderId: row.recyclingOrderId ?? null,
      consultOrderId: row.consultOrderId ?? null,
      orderType: row.orderType as ComplaintDto['orderType'],
      reasons: parseComplaintReasons(row.reasons),
      description: row.description,
      evidenceImages: row.evidenceImages ? (row.evidenceImages as string[]) : null,
      status: row.status as ComplaintDto['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** 将含关联订单数据的 Complaint 行映射为管理端富 DTO */
  private toRichDto(row: ComplaintWithRelations): ComplaintRichDto {
    const relatedOrder = row.cleaningOrder ?? row.recyclingOrder ?? row.consultOrder;

    const serviceAddress =
      row.cleaningOrder
        ? this.formatAddressSnapshot(row.cleaningOrder.addressSnapshot)
        : row.recyclingOrder
          ? this.formatAddressSnapshot(row.recyclingOrder.addressSnapshot)
          : (row.consultOrder?.serviceAddress ?? null);

    const serviceType =
      row.cleaningOrder?.serviceItem ??
      row.recyclingOrder?.itemType ??
      row.consultOrder?.serviceType ??
      null;

    return {
      ...this.toDto(row),
      orderNo: relatedOrder?.orderNo ?? null,
      serviceType,
      serviceAddress,
      contactName: relatedOrder?.contactName ?? row.resident?.name ?? null,
      contactPhone: relatedOrder?.contactPhone ?? row.resident?.phone ?? null,
      isProxyOrder: relatedOrder?.isProxyOrder ?? false,
      serviceContactName: relatedOrder?.serviceContactName ?? null,
      serviceContactPhone: relatedOrder?.serviceContactPhone ?? null,
      orderSource: relatedOrder ? (relatedOrder.source as string | null) : null,
      remark: relatedOrder?.remark ?? null,
    };
  }

  /** 将 addressSnapshot JSON 格式化为地址字符串 */
  private formatAddressSnapshot(snapshot: Prisma.JsonValue | null | undefined): string | null {
    if (!snapshot) return null;
    const obj = snapshot as Record<string, string | undefined>;
    const parts = [obj.province, obj.city, obj.district, obj.detail, obj.buildingInfo].filter(Boolean);
    return parts.length > 0 ? parts.join('') : null;
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

/** 读取投诉原因快照；忽略结构不符的脏数据，避免详情页整条渲染失败 */
function parseComplaintReasons(value: Prisma.JsonValue): ComplaintReasonSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { configId, label } = item as Record<string, unknown>;
    if (typeof configId !== 'number' || typeof label !== 'string') return [];
    return [{ configId, label }];
  });
}
