import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressSnapshot, CleaningOrderDto, OrderSource } from '@dayangyunjie/shared';
import { CleaningOrder, OrderSource as PrismaOrderSource, OrderStatus as PrismaOrderStatus, PhotoType, Prisma, Worker, WorkPhoto } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { GeoService } from '../../common/geo/geo.service';
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
    private readonly geoService: GeoService,
  ) {}

  async create(createCleaningOrderDto: CreateCleaningOrderDto): Promise<CleaningOrderDto> {
    this.validateProxyFields(createCleaningOrderDto);

    // 管理后台代下单时 addressSnapshotText 与 addressId 必须二选一
    if (!createCleaningOrderDto.addressId && !createCleaningOrderDto.addressSnapshotText) {
      throw new BadRequestException('addressId 或 addressSnapshotText 必须提供其中之一');
    }

    for (let attempt = 0; attempt < ORDER_NO_RETRY_TIMES; attempt += 1) {
      try {
        const row = await this.prismaService.$transaction(async (tx) => {
          // 有 residentId 时校验居民存在性（小程序用户路径）
          if (createCleaningOrderDto.residentId) {
            const resident = await tx.resident.findUnique({
              where: { id: createCleaningOrderDto.residentId },
              select: { id: true },
            });
            if (!resident) {
              throw new NotFoundException(`Resident ${createCleaningOrderDto.residentId} not found`);
            }
          }

          // 构建地址快照：有 addressId 则从数据库取；否则使用管理后台直传的文本
          let addressSnapshot: Prisma.InputJsonValue;
          if (createCleaningOrderDto.addressId) {
            const address = await tx.address.findUnique({
              where: { id: createCleaningOrderDto.addressId },
            });
            if (!address) {
              throw new NotFoundException(`Address ${createCleaningOrderDto.addressId} not found`);
            }
            if (createCleaningOrderDto.residentId && address.residentId !== createCleaningOrderDto.residentId) {
              throw new BadRequestException('addressId does not belong to residentId');
            }
            addressSnapshot = this.toAddressSnapshot(address) as unknown as Prisma.InputJsonValue;
          } else {
            // 管理后台代下单：直接用文本构建简单快照
            addressSnapshot = {
              detail: createCleaningOrderDto.addressSnapshotText,
              contactName: createCleaningOrderDto.contactName,
              contactPhone: createCleaningOrderDto.contactPhone,
            } as unknown as Prisma.InputJsonValue;
          }

          const catalog = await tx.serviceCatalog.findFirst({
            where: {
              bizType: 'CLEANING',
              name: createCleaningOrderDto.serviceItem,
              isEnabled: true,
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

          return tx.cleaningOrder.create({
            data: {
              orderNo,
              residentId: createCleaningOrderDto.residentId ?? null,
              serviceItem: createCleaningOrderDto.serviceItem,
              serviceDuration,
              appointDate,
              appointTimeSlot: createCleaningOrderDto.appointTimeSlot,
              addressSnapshot,
              contactName: createCleaningOrderDto.contactName,
              contactPhone: createCleaningOrderDto.contactPhone,
              remark: createCleaningOrderDto.remark,
              source: (createCleaningOrderDto.source ?? OrderSource.MINIPROGRAM) as PrismaOrderSource,
              isProxyOrder: createCleaningOrderDto.isProxyOrder ?? false,
              serviceContactName: createCleaningOrderDto.serviceContactName,
              serviceContactPhone: createCleaningOrderDto.serviceContactPhone,
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
    const { page = 1, pageSize = 10, status, statuses, residentId, workerId, appointDateFrom, appointDateTo, keyword } = query;

    // statuses（逗号分隔）优先级高于 status 单值，供居民端「待服务」聚合 Tab 使用
    const statusList = statuses
      ? statuses.split(',').map((s) => s.trim()).filter(Boolean) as PrismaOrderStatus[]
      : null;

    const where: Prisma.CleaningOrderWhereInput = {
      ...(residentId ? { residentId } : {}),
      ...(workerId ? { workerId } : {}),
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
      this.prismaService.cleaningOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
        include: { worker: { select: { id: true, name: true, phone: true, gender: true } } },
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
    const row = await this.prismaService.cleaningOrder.findUnique({
      where: { id },
      include: {
        workPhotos: true,
        worker: { select: { id: true, name: true, phone: true, gender: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`CleaningOrder ${id} not found`);
    }
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
   * GPS 签到：员工上传经纬度，委托 GeoService 校验是否在 200m 内。
   * 超距时标记 gpsRemark 但不阻断流程，状态 ACCEPTED → IN_SERVICE。
   */
  async gpsCheckin(id: number, dto: GpsCheckinDto): Promise<CleaningOrderDto> {
    const order = await this.findOneOrThrow(id);
    const snapshot = order.addressSnapshot as unknown as AddressSnapshot;

    const { distance: gpsDistance, remark: gpsRemark } = this.geoService.validateCheckin(
      snapshot?.lat,
      snapshot?.lng,
      dto.lat,
      dto.lng,
    );

    console.info(`[GPS-CHECKIN] cleaning order=${id} distance=${gpsDistance}m remark=${gpsRemark}`);

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
        data: [
          ...(dto.beforePhotoUrls ?? []).map((url) => ({
            cleaningOrderId: id,
            orderType: 'CLEANING',
            photoType: PhotoType.BEFORE,
            url,
            uploadedBy: dto.operatorId,
          })),
          ...(dto.afterPhotoUrls ?? []).map((url) => ({
            cleaningOrderId: id,
            orderType: 'CLEANING',
            photoType: PhotoType.AFTER,
            url,
            uploadedBy: dto.operatorId,
          })),
        ],
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

  private async findOneOrThrow(id: number) {
    const row = await this.prismaService.cleaningOrder.findUnique({
      where: { id },
      include: { worker: { select: { id: true, name: true, phone: true, gender: true } } },
    });
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

  private toDto(row: CleaningOrder & { workPhotos?: WorkPhoto[]; worker?: Pick<Worker, 'id' | 'name' | 'phone' | 'gender'> | null }): CleaningOrderDto {
    return {
      id: row.id,
      orderNo: row.orderNo,
      residentId: row.residentId,
      workerId: row.workerId,
      worker: row.worker
        ? {
            id: row.worker.id,
            name: row.worker.name,
            phone: row.worker.phone,
            ...('gender' in row.worker ? { gender: row.worker.gender } : {}),
          }
        : null,
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
      serviceContactName: row.serviceContactName,
      serviceContactPhone: row.serviceContactPhone,
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
      workPhotos: row.workPhotos?.map((p) => ({
        id: p.id,
        cleaningOrderId: p.cleaningOrderId,
        recyclingOrderId: p.recyclingOrderId,
        orderType: p.orderType as 'CLEANING' | 'RECYCLING',
        photoType: p.photoType as 'BEFORE' | 'AFTER',
        url: p.url,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })),
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
