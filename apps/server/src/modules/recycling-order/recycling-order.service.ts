import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressSnapshot, RecyclingOrderDto, OrderSource } from '@dayangyunjie/shared';
import { RecyclingOrder, OrderSource as PrismaOrderSource, OrderStatus as PrismaOrderStatus, PhotoType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { GeoService } from '../../common/geo/geo.service';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CreateRecyclingOrderDto } from './dto/create-recycling-order.dto';
import { GpsCheckinDto } from './dto/gps-checkin.dto';
import { QueryRecyclingOrderDto } from './dto/query-recycling-order.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { UpdateRecyclingOrderDto } from './dto/update-recycling-order.dto';

const ORDER_NO_PREFIX = 'RCY';
const ORDER_NO_SEQ_LENGTH = 6;
const ORDER_NO_RETRY_TIMES = 3;

@Injectable()
export class RecyclingOrderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stateMachine: OrderStateMachineService,
    private readonly geoService: GeoService,
  ) {}

  async create(createRecyclingOrderDto: CreateRecyclingOrderDto): Promise<RecyclingOrderDto> {
    this.validateProxyFields(createRecyclingOrderDto);

    for (let attempt = 0; attempt < ORDER_NO_RETRY_TIMES; attempt += 1) {
      try {
        const row = await this.prismaService.$transaction(async (tx) => {
          const resident = await tx.resident.findUnique({
            where: { id: createRecyclingOrderDto.residentId },
            select: { id: true },
          });
          if (!resident) {
            throw new NotFoundException(`Resident ${createRecyclingOrderDto.residentId} not found`);
          }

          const address = await tx.address.findUnique({
            where: { id: createRecyclingOrderDto.addressId },
          });
          if (!address) {
            throw new NotFoundException(`Address ${createRecyclingOrderDto.addressId} not found`);
          }
          if (address.residentId !== createRecyclingOrderDto.residentId) {
            throw new BadRequestException('addressId does not belong to residentId');
          }

          const orderNo = await this.generateOrderNo(tx);
          const appointDate = this.parseDateString(createRecyclingOrderDto.appointDate, 'appointDate');

          return tx.recyclingOrder.create({
            data: {
              orderNo,
              residentId: createRecyclingOrderDto.residentId,
              itemType: createRecyclingOrderDto.serviceItem,
              estimatedWeight: createRecyclingOrderDto.estimatedWeight,
              appointDate,
              appointTimeSlot: createRecyclingOrderDto.appointTimeSlot,
              addressSnapshot: this.toAddressSnapshot(address) as unknown as Prisma.InputJsonValue,
              contactName: createRecyclingOrderDto.contactName,
              contactPhone: createRecyclingOrderDto.contactPhone,
              remark: createRecyclingOrderDto.remark,
              source: (createRecyclingOrderDto.source ?? OrderSource.MINIPROGRAM) as PrismaOrderSource,
              isProxyOrder: createRecyclingOrderDto.isProxyOrder ?? false,
              serviceContactName: createRecyclingOrderDto.serviceContactName,
              serviceContactPhone: createRecyclingOrderDto.serviceContactPhone,
            },
          });
        });

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

  async findAll(query: QueryRecyclingOrderDto) {
    const { page = 1, pageSize = 10, status, statuses, residentId, appointDateFrom, appointDateTo, keyword } = query;

    // statuses（逗号分隔）优先级高于 status 单值，供居民端「待服务」聚合 Tab 使用
    const statusList = statuses
      ? statuses.split(',').map((s) => s.trim()).filter(Boolean) as PrismaOrderStatus[]
      : null;

    const where: Prisma.RecyclingOrderWhereInput = {
      ...(residentId ? { residentId } : {}),
      ...(statusList && statusList.length > 0
        ? { status: { in: statusList } }
        : status
          ? { status: status as PrismaOrderStatus }
          : {}),
      ...(appointDateFrom || appointDateTo
        ? {
            appointDate: {
              ...(appointDateFrom
                ? { gte: this.parseDateString(appointDateFrom, 'appointDateFrom') }
                : {}),
              ...(appointDateTo
                ? { lte: this.parseDateString(appointDateTo, 'appointDateTo') }
                : {}),
            },
          }
        : {}),
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
      this.prismaService.recyclingOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
      }),
      this.prismaService.recyclingOrder.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number): Promise<RecyclingOrderDto> {
    const row = await this.findOneOrThrow(id);
    return this.toDto(row);
  }

  async update(id: number, updateRecyclingOrderDto: UpdateRecyclingOrderDto): Promise<RecyclingOrderDto> {
    await this.findOneOrThrow(id);

    const data: Prisma.RecyclingOrderUpdateInput = {
      ...(updateRecyclingOrderDto.serviceItem
        ? { itemType: updateRecyclingOrderDto.serviceItem }
        : {}),
      ...(typeof updateRecyclingOrderDto.estimatedWeight === 'number'
        ? { estimatedWeight: updateRecyclingOrderDto.estimatedWeight }
        : {}),
      ...(updateRecyclingOrderDto.appointDate
        ? { appointDate: this.parseDateString(updateRecyclingOrderDto.appointDate, 'appointDate') }
        : {}),
      ...(updateRecyclingOrderDto.appointTimeSlot
        ? { appointTimeSlot: updateRecyclingOrderDto.appointTimeSlot }
        : {}),
      ...(updateRecyclingOrderDto.contactName ? { contactName: updateRecyclingOrderDto.contactName } : {}),
      ...(updateRecyclingOrderDto.contactPhone
        ? { contactPhone: updateRecyclingOrderDto.contactPhone }
        : {}),
      ...(typeof updateRecyclingOrderDto.remark === 'string'
        ? { remark: updateRecyclingOrderDto.remark }
        : {}),
    };

    const row = await this.prismaService.recyclingOrder.update({
      where: { id },
      data,
    });
    return this.toDto(row);
  }

  /**
   * 执行废品订单状态机转移。
   * 在 Prisma 事务中完成状态更新 + order_status_log 写入。
   */
  async transitionStatus(id: number, dto: TransitionOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: dto.toStatus,
        operatorId: dto.operatorId,
        operatorType: dto.operatorType,
        remark: dto.remark,
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * 派单：管理员分配员工，状态 PENDING_ASSIGN → ASSIGNED。
   * workerId 写入与状态转移在同一事务中完成。
   */
  async assignOrder(id: number, dto: AssignOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      const worker = await tx.worker.findUnique({
        where: { id: dto.workerId },
        select: { id: true },
      });
      if (!worker) {
        throw new NotFoundException(`Worker ${dto.workerId} not found`);
      }

      await tx.recyclingOrder.update({
        where: { id },
        data: { workerId: dto.workerId },
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'ASSIGNED',
        operatorId: dto.operatorId,
        operatorType: 'ADMIN',
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * 接单：员工确认接受派单，状态 ASSIGNED → ACCEPTED。
   */
  async acceptOrder(id: number, dto: AcceptOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'ACCEPTED',
        operatorId: dto.operatorId,
        operatorType: 'WORKER',
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * GPS 签到：员工上传经纬度，委托 GeoService 校验是否在 200m 内。
   * 超距时标记 gpsRemark 但不阻断流程，状态 ACCEPTED → IN_SERVICE。
   */
  async gpsCheckin(id: number, dto: GpsCheckinDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);
    const snapshot = order.addressSnapshot as unknown as AddressSnapshot;

    const { distance: gpsDistance, remark: gpsRemark } = this.geoService.validateCheckin(
      snapshot?.lat,
      snapshot?.lng,
      dto.lat,
      dto.lng,
    );

    console.info(`[GPS-CHECKIN] recycling order=${id} distance=${gpsDistance}m remark=${gpsRemark}`);

    await this.prismaService.$transaction(async (tx) => {
      await tx.recyclingOrder.update({
        where: { id },
        data: {
          gpsLat: dto.lat,
          gpsLng: dto.lng,
          gpsCheckinAt: new Date(),
          gpsDistance,
          gpsRemark,
        },
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'IN_SERVICE',
        operatorId: dto.operatorId,
        operatorType: 'WORKER',
        remark: gpsRemark ?? undefined,
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * 完成服务：员工上传完工照片，状态 IN_SERVICE → PENDING_REVIEW。
   * 每个 photoUrl 对应一条 WorkPhoto 记录（photoType: AFTER，orderType: RECYCLING）。
   */
  async completeOrder(id: number, dto: CompleteOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await tx.workPhoto.createMany({
        data: dto.photoUrls.map((url) => ({
          recyclingOrderId: id,
          orderType: 'RECYCLING',
          photoType: PhotoType.AFTER,
          url,
          uploadedBy: dto.operatorId,
        })),
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'PENDING_REVIEW',
        operatorId: dto.operatorId,
        operatorType: 'WORKER',
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * 取消订单：仅允许 PENDING_ASSIGN → CANCELLED，其他状态由状态机抛出 400。
   */
  async cancelOrder(id: number, dto: CancelOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        operatorId: dto.operatorId,
        operatorType: dto.operatorType,
        remark: dto.remark,
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  private async findOneOrThrow(id: number): Promise<RecyclingOrder> {
    const row = await this.prismaService.recyclingOrder.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`RecyclingOrder ${id} not found`);
    }
    return row;
  }

  private async generateOrderNo(tx: Prisma.TransactionClient): Promise<string> {
    const datePart = this.formatDatePart(new Date());
    const prefix = `${ORDER_NO_PREFIX}${datePart}`;
    const lastOrder = await tx.recyclingOrder.findFirst({
      where: { orderNo: { startsWith: prefix } },
      orderBy: { orderNo: 'desc' },
      select: { orderNo: true },
    });

    const currentSeq = lastOrder ? Number.parseInt(lastOrder.orderNo.slice(-ORDER_NO_SEQ_LENGTH), 10) : 0;
    const nextSeq = currentSeq + 1;
    const paddedSeq = String(nextSeq).padStart(ORDER_NO_SEQ_LENGTH, '0');
    return `${prefix}${paddedSeq}`;
  }

  private validateProxyFields(dto: CreateRecyclingOrderDto): void {
    if (!dto.isProxyOrder) {
      return;
    }
    if (!dto.serviceContactName || !dto.serviceContactPhone) {
      throw new BadRequestException('serviceContactName and serviceContactPhone are required when isProxyOrder is true');
    }
  }

  private formatDatePart(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private parseDateString(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private toAddressSnapshot(address: {
    contactName: string;
    contactPhone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    buildingInfo: string | null;
    addressTag: string | null;
    lat: number | null;
    lng: number | null;
  }): AddressSnapshot {
    return {
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      ...(address.buildingInfo ? { buildingInfo: address.buildingInfo } : {}),
      ...(address.addressTag ? { addressTag: address.addressTag } : {}),
      ...(typeof address.lat === 'number' ? { lat: address.lat } : {}),
      ...(typeof address.lng === 'number' ? { lng: address.lng } : {}),
    };
  }

  private toDto(row: RecyclingOrder): RecyclingOrderDto {
    return {
      id: row.id,
      orderNo: row.orderNo,
      residentId: row.residentId,
      workerId: row.workerId,
      serviceItem: row.itemType,
      estimatedWeight: row.estimatedWeight,
      appointDate: row.appointDate.toISOString(),
      appointTimeSlot: row.appointTimeSlot,
      addressSnapshot: row.addressSnapshot as unknown as AddressSnapshot,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      remark: row.remark,
      source: row.source as RecyclingOrderDto['source'],
      isProxyOrder: row.isProxyOrder,
      serviceContactName: row.serviceContactName,
      serviceContactPhone: row.serviceContactPhone,
      status: row.status as RecyclingOrderDto['status'],
      gpsLat: row.gpsLat,
      gpsLng: row.gpsLng,
      gpsCheckinAt: row.gpsCheckinAt?.toISOString() ?? null,
      gpsDistance: row.gpsDistance,
      gpsRemark: row.gpsRemark,
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
