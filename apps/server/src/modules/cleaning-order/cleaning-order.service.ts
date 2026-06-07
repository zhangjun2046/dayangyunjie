import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressSnapshot, CleaningOrderDto, OrderSource } from '@dayangyunjie/shared';
import { CleaningOrder, OrderSource as PrismaOrderSource, OrderStatus as PrismaOrderStatus, PhotoType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CreateCleaningOrderDto } from './dto/create-cleaning-order.dto';
import { GpsCheckinDto } from './dto/gps-checkin.dto';
import { QueryCleaningOrderDto } from './dto/query-cleaning-order.dto';
import { TransitionOrderDto } from './dto/transition-order.dto';
import { UpdateCleaningOrderDto } from './dto/update-cleaning-order.dto';

const ORDER_NO_PREFIX = 'CLN';
const ORDER_NO_SEQ_LENGTH = 6;
const ORDER_NO_RETRY_TIMES = 3;

@Injectable()
export class CleaningOrderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stateMachine: OrderStateMachineService,
  ) {}

  async create(createCleaningOrderDto: CreateCleaningOrderDto): Promise<CleaningOrderDto> {
    this.validateProxyFields(createCleaningOrderDto);

    for (let attempt = 0; attempt < ORDER_NO_RETRY_TIMES; attempt += 1) {
      try {
        const row = await this.prismaService.$transaction(async (tx) => {
          const resident = await tx.resident.findUnique({
            where: { id: createCleaningOrderDto.residentId },
            select: { id: true },
          });
          if (!resident) {
            throw new NotFoundException(`Resident ${createCleaningOrderDto.residentId} not found`);
          }

          const address = await tx.address.findUnique({
            where: { id: createCleaningOrderDto.addressId },
          });
          if (!address) {
            throw new NotFoundException(`Address ${createCleaningOrderDto.addressId} not found`);
          }
          if (address.residentId !== createCleaningOrderDto.residentId) {
            throw new BadRequestException('addressId does not belong to residentId');
          }

          const catalog = await tx.serviceCatalog.findFirst({
            where: {
              bizType: 'CLEANING',
              serviceItem: createCleaningOrderDto.serviceItem,
              isActive: true,
            },
          });
          if (!catalog) {
            throw new NotFoundException(
              `ServiceCatalog for ${createCleaningOrderDto.serviceItem} not found`,
            );
          }

          const orderNo = await this.generateOrderNo(tx);
          const serviceDuration = createCleaningOrderDto.serviceDuration ?? 2;
          const appointDate = this.parseDateString(createCleaningOrderDto.appointDate, 'appointDate');
          const referenceAmount = catalog.priceMin.mul(serviceDuration);

          return tx.cleaningOrder.create({
            data: {
              orderNo,
              residentId: createCleaningOrderDto.residentId,
              serviceItem: createCleaningOrderDto.serviceItem,
              serviceDuration,
              appointDate,
              appointTimeSlot: createCleaningOrderDto.appointTimeSlot,
              addressSnapshot: this.toAddressSnapshot(address) as unknown as Prisma.InputJsonValue,
              contactName: createCleaningOrderDto.contactName,
              contactPhone: createCleaningOrderDto.contactPhone,
              remark: createCleaningOrderDto.remark,
              source: (createCleaningOrderDto.source ?? OrderSource.MINIPROGRAM) as PrismaOrderSource,
              isProxyOrder: createCleaningOrderDto.isProxyOrder ?? false,
              proxyName: createCleaningOrderDto.proxyName,
              proxyPhone: createCleaningOrderDto.proxyPhone,
              referenceAmount,
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

  async findAll(query: QueryCleaningOrderDto) {
    const { page = 1, pageSize = 10, status, appointDateFrom, appointDateTo, keyword } = query;

    const where: Prisma.CleaningOrderWhereInput = {
      ...(status ? { status: status as PrismaOrderStatus } : {}),
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
      this.prismaService.cleaningOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
      }),
      this.prismaService.cleaningOrder.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number): Promise<CleaningOrderDto> {
    const row = await this.findOneOrThrow(id);
    return this.toDto(row);
  }

  async update(id: number, updateCleaningOrderDto: UpdateCleaningOrderDto): Promise<CleaningOrderDto> {
    await this.findOneOrThrow(id);

    const data: Prisma.CleaningOrderUpdateInput = {
      ...(updateCleaningOrderDto.appointDate
        ? { appointDate: this.parseDateString(updateCleaningOrderDto.appointDate, 'appointDate') }
        : {}),
      ...(updateCleaningOrderDto.appointTimeSlot
        ? { appointTimeSlot: updateCleaningOrderDto.appointTimeSlot }
        : {}),
      ...(updateCleaningOrderDto.contactName ? { contactName: updateCleaningOrderDto.contactName } : {}),
      ...(updateCleaningOrderDto.contactPhone
        ? { contactPhone: updateCleaningOrderDto.contactPhone }
        : {}),
      ...(typeof updateCleaningOrderDto.remark === 'string'
        ? { remark: updateCleaningOrderDto.remark }
        : {}),
    };

    const row = await this.prismaService.cleaningOrder.update({
      where: { id },
      data,
    });
    return this.toDto(row);
  }

  /**
   * 执行保洁订单状态机转移。
   * 在 Prisma 事务中完成状态更新 + order_status_log 写入。
   */
  async transitionStatus(id: number, dto: TransitionOrderDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'CLEANING',
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
  async assignOrder(id: number, dto: AssignOrderDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      const worker = await tx.worker.findUnique({
        where: { id: dto.workerId },
        select: { id: true },
      });
      if (!worker) {
        throw new NotFoundException(`Worker ${dto.workerId} not found`);
      }

      // 先写 workerId，再做状态转移（均在事务内）
      await tx.cleaningOrder.update({
        where: { id },
        data: { workerId: dto.workerId },
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'CLEANING',
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
  async acceptOrder(id: number, dto: AcceptOrderDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'CLEANING',
        fromStatus: order.status,
        toStatus: 'ACCEPTED',
        operatorId: dto.operatorId,
        operatorType: 'WORKER',
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  /**
   * GPS 签到：员工上传经纬度，系统用 Haversine 校验是否在 200m 内。
   * 超距时标记 gpsRemark 但不阻断流程，状态 ACCEPTED → IN_SERVICE。
   */
  async gpsCheckin(id: number, dto: GpsCheckinDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);
    const snapshot = order.addressSnapshot as unknown as AddressSnapshot;

    let gpsDistance: number | null = null;
    let gpsRemark: string | null = null;

    if (typeof snapshot?.lat === 'number' && typeof snapshot?.lng === 'number') {
      const distanceM = this.haversineMeters(snapshot.lat, snapshot.lng, dto.lat, dto.lng);
      gpsDistance = Math.round(distanceM * 10) / 10; // 保留 1 位小数（米）
      if (distanceM > 200) {
        gpsRemark = `超距签到，距离${Math.round(distanceM)}m`;
        console.info(`[GPS-CHECKIN] order=${id} out-of-range distance=${Math.round(distanceM)}m`);
      }
    } else {
      gpsRemark = '地址无坐标，跳过距离校验';
      console.info(`[GPS-CHECKIN] order=${id} address has no coordinates, distance check skipped`);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.cleaningOrder.update({
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
        orderType: 'CLEANING',
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
   * 每个 photoUrl 对应一条 WorkPhoto 记录（photoType: AFTER）。
   */
  async completeOrder(id: number, dto: CompleteOrderDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await tx.workPhoto.createMany({
        data: dto.photoUrls.map((url) => ({
          cleaningOrderId: id,
          orderType: 'CLEANING',
          photoType: PhotoType.AFTER,
          url,
          uploadedBy: dto.operatorId,
        })),
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'CLEANING',
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
  async cancelOrder(id: number, dto: CancelOrderDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);

    await this.prismaService.$transaction(async (tx) => {
      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'CLEANING',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        operatorId: dto.operatorId,
        operatorType: dto.operatorType,
        remark: dto.remark,
      });
    });

    return this.toDto(await this.findOneOrThrow(id));
  }

  private async findOneOrThrow(id: number): Promise<CleaningOrder> {
    const row = await this.prismaService.cleaningOrder.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`CleaningOrder ${id} not found`);
    }
    return row;
  }

  private async generateOrderNo(tx: Prisma.TransactionClient): Promise<string> {
    const datePart = this.formatDatePart(new Date());
    const prefix = `${ORDER_NO_PREFIX}${datePart}`;
    const lastOrder = await tx.cleaningOrder.findFirst({
      where: { orderNo: { startsWith: prefix } },
      orderBy: { orderNo: 'desc' },
      select: { orderNo: true },
    });

    const currentSeq = lastOrder ? Number.parseInt(lastOrder.orderNo.slice(-ORDER_NO_SEQ_LENGTH), 10) : 0;
    const nextSeq = currentSeq + 1;
    const paddedSeq = String(nextSeq).padStart(ORDER_NO_SEQ_LENGTH, '0');
    return `${prefix}${paddedSeq}`;
  }

  private validateProxyFields(dto: CreateCleaningOrderDto): void {
    if (!dto.isProxyOrder) {
      return;
    }
    if (!dto.proxyName || !dto.proxyPhone) {
      throw new BadRequestException('proxyName and proxyPhone are required when isProxyOrder is true');
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
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    lat: number | null;
    lng: number | null;
  }): AddressSnapshot {
    return {
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      ...(typeof address.lat === 'number' ? { lat: address.lat } : {}),
      ...(typeof address.lng === 'number' ? { lng: address.lng } : {}),
    };
  }

  private toDto(row: CleaningOrder): CleaningOrderDto {
    return {
      id: row.id,
      orderNo: row.orderNo,
      residentId: row.residentId,
      workerId: row.workerId,
      serviceItem: row.serviceItem,
      serviceDuration: row.serviceDuration,
      appointDate: row.appointDate.toISOString(),
      appointTimeSlot: row.appointTimeSlot,
      addressSnapshot: row.addressSnapshot as unknown as AddressSnapshot,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      remark: row.remark,
      source: row.source as CleaningOrderDto['source'],
      isProxyOrder: row.isProxyOrder,
      proxyName: row.proxyName,
      proxyPhone: row.proxyPhone,
      status: row.status as CleaningOrderDto['status'],
      referenceAmount: row.referenceAmount?.toString() ?? null,
      finalAmount: row.finalAmount?.toString() ?? null,
      paymentStatus: row.paymentStatus as CleaningOrderDto['paymentStatus'],
      paidAt: row.paidAt?.toISOString() ?? null,
      gpsLat: row.gpsLat,
      gpsLng: row.gpsLng,
      gpsCheckinAt: row.gpsCheckinAt?.toISOString() ?? null,
      gpsDistance: row.gpsDistance,
      gpsRemark: row.gpsRemark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Haversine 公式：计算两点间球面距离（米）。
   * 精度满足 200m 阈值判断，P2.8 可抽取为独立 GpsService 复用。
   */
  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球平均半径（米）
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
