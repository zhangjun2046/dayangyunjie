import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AddressSnapshot,
  OrderSource,
  RecyclingOrderDetailDto,
  RecyclingOrderDto,
  RecyclingOrderSelectedItem,
} from '@dayangyunjie/shared';
import { RecyclingOrder, OrderSource as PrismaOrderSource, OrderStatus as PrismaOrderStatus, PhotoType, Prisma, Worker, WorkPhoto } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from '../../common/order-state-machine/order-state-machine.service';
import { GeoService } from '../../common/geo/geo.service';
import { assertWorkerAssignable } from '../../common/worker/assert-worker-assignable';
import {
  OrderProgressService,
  ProgressRole,
  RequestIdentity,
} from '../../common/order-progress/order-progress.service';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CreateRecyclingOrderDto } from './dto/create-recycling-order.dto';
import { GpsCheckinDto } from './dto/gps-checkin.dto';
import { QueryRecyclingOrderDto } from './dto/query-recycling-order.dto';
import { ReassignOrderDto } from './dto/reassign-order.dto';
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
    private readonly orderProgressService?: OrderProgressService,
  ) {}

  async create(
    createRecyclingOrderDto: CreateRecyclingOrderDto,
    actor?: RequestIdentity | null,
  ): Promise<RecyclingOrderDto> {
    this.validateProxyFields(createRecyclingOrderDto);
    const createActor =
      actor ??
      (createRecyclingOrderDto.residentId
        ? { id: createRecyclingOrderDto.residentId, role: 'RESIDENT' as const }
        : null);
    if (!createActor) {
      throw new BadRequestException('创建订单缺少有效操作人');
    }

    // 管理后台代下单时 addressSnapshotText 与 addressId 必须二选一
    if (!createRecyclingOrderDto.addressId && !createRecyclingOrderDto.addressSnapshotText) {
      throw new BadRequestException('addressId 或 addressSnapshotText 必须提供其中之一');
    }

    for (let attempt = 0; attempt < ORDER_NO_RETRY_TIMES; attempt += 1) {
      try {
        const row = await this.prismaService.$transaction(async (tx) => {
          // 有 residentId 时校验居民存在性（小程序用户路径）
          if (createRecyclingOrderDto.residentId) {
            const resident = await tx.resident.findUnique({
              where: { id: createRecyclingOrderDto.residentId },
              select: { id: true },
            });
            if (!resident) {
              throw new NotFoundException(`Resident ${createRecyclingOrderDto.residentId} not found`);
            }
          }

          // 构建地址快照：有 addressId 则从数据库取；否则使用管理后台直传的文本
          let addressSnapshot: Prisma.InputJsonValue;
          if (createRecyclingOrderDto.addressId) {
            const address = await tx.address.findUnique({
              where: { id: createRecyclingOrderDto.addressId },
            });
            if (!address) {
              throw new NotFoundException(`Address ${createRecyclingOrderDto.addressId} not found`);
            }
            if (createRecyclingOrderDto.residentId && address.residentId !== createRecyclingOrderDto.residentId) {
              throw new BadRequestException('addressId does not belong to residentId');
            }
            addressSnapshot = this.toAddressSnapshot(address) as unknown as Prisma.InputJsonValue;
          } else {
            // 管理后台代下单：直接用文本构建简单快照
            addressSnapshot = {
              detail: createRecyclingOrderDto.addressSnapshotText,
              contactName: createRecyclingOrderDto.contactName,
              contactPhone: createRecyclingOrderDto.contactPhone,
            } as unknown as Prisma.InputJsonValue;
          }

          const orderNo = await this.generateOrderNo(tx);
          const appointDate = this.parseDateString(createRecyclingOrderDto.appointDate, 'appointDate');
          const snapshot = await this.resolveRecyclingSnapshot(tx, createRecyclingOrderDto);

          const order = await tx.recyclingOrder.create({
            data: {
              orderNo,
              residentId: createRecyclingOrderDto.residentId ?? null,
              itemType: createRecyclingOrderDto.serviceItem,
              estimatedWeight: createRecyclingOrderDto.estimatedWeight,
              selectedItems: snapshot.selectedItems
                ? (snapshot.selectedItems as unknown as Prisma.InputJsonValue)
                : Prisma.DbNull,
              hasElevator: snapshot.hasElevator,
              carryFloor: snapshot.carryFloor,
              appointDate,
              appointTimeSlot: createRecyclingOrderDto.appointTimeSlot,
              addressSnapshot,
              contactName: createRecyclingOrderDto.contactName,
              contactPhone: createRecyclingOrderDto.contactPhone,
              remark: createRecyclingOrderDto.remark,
              source: (createRecyclingOrderDto.source ?? OrderSource.MINIPROGRAM) as PrismaOrderSource,
              isProxyOrder: createRecyclingOrderDto.isProxyOrder ?? false,
              serviceContactName: createRecyclingOrderDto.serviceContactName,
              serviceContactPhone: createRecyclingOrderDto.serviceContactPhone,
            },
          });
          await tx.orderStatusLog.create({
            data: {
              orderId: order.id,
              orderType: 'RECYCLING',
              fromStatus: 'NONE',
              toStatus: 'PENDING_ASSIGN',
              operatorId: createActor.id,
              operatorType: createActor.role,
            },
          });
          return order;
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
    const { page = 1, pageSize = 10, status, statuses, residentId, workerId, appointDateFrom, appointDateTo, keyword, completedToday } = query;
    let completedTodayIds: number[] | undefined;
    if (completedToday) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);
      const logs = await this.prismaService.orderStatusLog.findMany({
        where: {
          orderType: 'RECYCLING',
          toStatus: 'PENDING_REVIEW',
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        select: { orderId: true },
      });
      completedTodayIds = logs.map((log) => log.orderId);
    }

    // statuses（逗号分隔）优先级高于 status 单值，供居民端「待服务」聚合 Tab 使用
    const statusList = statuses
      ? statuses.split(',').map((s) => s.trim()).filter(Boolean) as PrismaOrderStatus[]
      : null;

    const where: Prisma.RecyclingOrderWhereInput = {
      ...(completedTodayIds ? { id: { in: completedTodayIds } } : {}),
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
      this.prismaService.recyclingOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ id: 'desc' }],
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              phone: true,
              gender: true,
              rating: true,
              totalOrders: true,
            },
          },
        },
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

  async findOne(
    id: number,
    role: ProgressRole = 'ADMIN',
    viewerId?: number,
  ): Promise<RecyclingOrderDetailDto> {
    const row = await this.prismaService.recyclingOrder.findUnique({
      where: { id },
      include: {
        workPhotos: true,
        worker: {
          select: {
            id: true,
            name: true,
            phone: true,
            gender: true,
            rating: true,
            totalOrders: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(`RecyclingOrder ${id} not found`);
    }
    if (role === 'WORKER' && row.workerId !== viewerId) {
      throw new NotFoundException(`RecyclingOrder ${id} not found`);
    }
    return {
      ...this.toDto(row),
      progress: this.orderProgressService
        ? await this.orderProgressService.assemble({
            orderId: row.id,
            orderType: 'RECYCLING',
            currentStatus: row.status,
            createdAt: row.createdAt,
            workerName: row.worker?.name,
            role,
          })
        : [],
    };
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

    return this.findOne(id, dto.operatorType, dto.operatorId);
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
        select: { id: true, employmentStatus: true },
      });
      assertWorkerAssignable(worker, dto.workerId);

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

    return this.findOne(id, 'ADMIN');
  }

  /**
   * 接单：员工确认接受派单，状态 ASSIGNED → ACCEPTED。
   */
  async acceptOrder(id: number, dto: AcceptOrderDto): Promise<RecyclingOrderDto> {
    await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.recyclingOrder.updateMany({
        where: {
          id,
          status: 'ASSIGNED',
          workerId: dto.operatorId,
        },
        data: { status: 'ACCEPTED' },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('订单已被改派、已接单或不属于当前员工');
      }
      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          orderType: 'RECYCLING',
          fromStatus: 'ASSIGNED',
          toStatus: 'ACCEPTED',
          operatorId: dto.operatorId,
          operatorType: 'WORKER',
        },
      });
    });

    return this.findOne(id, 'WORKER', dto.operatorId);
  }

  async reassignOrder(id: number, dto: ReassignOrderDto): Promise<RecyclingOrderDto> {
    await this.prismaService.$transaction(async (tx) => {
      const order = await tx.recyclingOrder.findUnique({
        where: { id },
        select: {
          status: true,
          workerId: true,
          worker: { select: { name: true } },
        },
      });
      if (!order) throw new NotFoundException(`RecyclingOrder ${id} not found`);
      if (order.status !== 'ASSIGNED') {
        throw new BadRequestException('仅员工尚未接单的订单允许改派');
      }
      if (!order.workerId) throw new BadRequestException('订单尚未派单');
      if (order.workerId === dto.workerId) {
        throw new BadRequestException('不能改派给当前服务人员');
      }

      const nextWorker = await tx.worker.findUnique({
        where: { id: dto.workerId },
        select: { id: true, name: true, employmentStatus: true },
      });
      assertWorkerAssignable(nextWorker, dto.workerId);

      const updated = await tx.recyclingOrder.updateMany({
        where: { id, status: 'ASSIGNED', workerId: order.workerId },
        data: { workerId: dto.workerId },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('订单状态已变化，无法改派');
      }

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          orderType: 'RECYCLING',
          fromStatus: 'ASSIGNED',
          toStatus: 'ASSIGNED',
          operatorId: dto.operatorId,
          operatorType: 'ADMIN',
          remark: `服务人员由${order.worker?.name ?? `员工${order.workerId}`}变更为${nextWorker.name}（管理员改派）`,
        },
      });
    });

    return this.findOne(id, 'ADMIN');
  }

  /**
   * GPS 签到：员工上传经纬度，委托 GeoService 校验是否在 200m 内。
   * 超距时标记 gpsRemark 但不阻断流程，状态 ACCEPTED → IN_SERVICE。
   */
  async gpsCheckin(id: number, dto: GpsCheckinDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);
    if (order.workerId !== dto.operatorId) {
      throw new NotFoundException(`RecyclingOrder ${id} not found`);
    }
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

    return this.findOne(id, 'WORKER', dto.operatorId);
  }

  /**
   * 完成服务：员工上传完工照片，状态 IN_SERVICE → PENDING_REVIEW。
   * 每个 photoUrl 对应一条 WorkPhoto 记录（photoType: AFTER，orderType: RECYCLING）。
   */
  async completeOrder(id: number, dto: CompleteOrderDto): Promise<RecyclingOrderDto> {
    const order = await this.findOneOrThrow(id);
    if (order.workerId !== dto.operatorId) {
      throw new NotFoundException(`RecyclingOrder ${id} not found`);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.workPhoto.createMany({
        data: [
          ...(dto.beforePhotoUrls ?? []).map((url) => ({
            recyclingOrderId: id,
            orderType: 'RECYCLING',
            photoType: PhotoType.BEFORE,
            url,
            uploadedBy: dto.operatorId,
          })),
          ...(dto.afterPhotoUrls ?? []).map((url) => ({
            recyclingOrderId: id,
            orderType: 'RECYCLING',
            photoType: PhotoType.AFTER,
            url,
            uploadedBy: dto.operatorId,
          })),
        ],
      });

      await this.stateMachine.transition(tx, {
        orderId: id,
        orderType: 'RECYCLING',
        fromStatus: order.status,
        toStatus: 'PENDING_REVIEW',
        operatorId: dto.operatorId,
        operatorType: 'WORKER',
      });
      await tx.worker.update({
        where: { id: dto.operatorId },
        data: { totalOrders: { increment: 1 } },
      });
    });

    return this.findOne(id, 'WORKER', dto.operatorId);
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

    return this.findOne(id, dto.operatorType);
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

  private async resolveRecyclingSnapshot(
    tx: Prisma.TransactionClient,
    dto: CreateRecyclingOrderDto,
  ): Promise<{
    selectedItems: RecyclingOrderSelectedItem[] | null;
    hasElevator: boolean | null;
    carryFloor: number | null;
  }> {
    if (dto.selectedItems === undefined || dto.selectedItems === null) {
      return { selectedItems: null, hasElevator: null, carryFloor: null };
    }
    if (dto.selectedItems.length === 0) {
      throw new BadRequestException('请选择回收物品');
    }

    for (const item of dto.selectedItems) {
      if (!item.name?.trim() || !item.priceText?.trim() || item.quantity < 1) {
        throw new BadRequestException('请重新选择回收物品');
      }
    }

    const ids = dto.selectedItems.map((item) => item.itemId);
    const liveRows = await tx.recyclingItem.findMany({
      where: {
        id: { in: ids },
        isEnabled: true,
        catalog: { isEnabled: true, bizType: 'RECYCLING' },
      },
    });
    const liveById = new Map(liveRows.map((row) => [row.id, row]));
    const selectedItems = dto.selectedItems.map((item) => {
      const live = liveById.get(item.itemId);
      if (!live) {
        throw new BadRequestException('请重新选择回收物品');
      }
      return {
        itemId: live.id,
        name: live.name,
        priceText: live.priceText,
        quantity: item.quantity,
      };
    });

    const isLarge = dto.serviceItem.includes('大件');
    const isSmall = dto.serviceItem.includes('小件');
    if (isLarge || isSmall) {
      if (dto.hasElevator !== true && dto.hasElevator !== false) {
        throw new BadRequestException('请选择是否有电梯');
      }
    }

    let carryFloor: number | null = null;
    if (isLarge) {
      if (
        typeof dto.carryFloor !== 'number' ||
        !Number.isInteger(dto.carryFloor) ||
        dto.carryFloor < 1 ||
        dto.carryFloor > 30
      ) {
        throw new BadRequestException('请选择搬运楼层');
      }
      carryFloor = dto.carryFloor;
    }

    return {
      selectedItems,
      hasElevator: isLarge || isSmall ? dto.hasElevator! : (dto.hasElevator ?? null),
      carryFloor,
    };
  }

  private toSelectedItemsSnapshot(value: Prisma.JsonValue | null): RecyclingOrderSelectedItem[] | null {
    return Array.isArray(value) ? (value as unknown as RecyclingOrderSelectedItem[]) : null;
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

  private toDto(row: RecyclingOrder & { workPhotos?: WorkPhoto[]; worker?: Pick<Worker, 'id' | 'name' | 'phone' | 'gender' | 'rating' | 'totalOrders'> | null }): RecyclingOrderDto {
    return {
      id: row.id,
      orderNo: row.orderNo,
      residentId: row.residentId,
      workerId: row.workerId,
      worker: row.worker ?? null,
      serviceItem: row.itemType,
      estimatedWeight: row.estimatedWeight,
      selectedItems: this.toSelectedItemsSnapshot(row.selectedItems),
      hasElevator: row.hasElevator,
      carryFloor: row.carryFloor,
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
