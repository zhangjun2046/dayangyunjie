import { BadRequestException } from '@nestjs/common';
import { GeoService } from '../../common/geo/geo.service';
import { RecyclingOrderService } from './recycling-order.service';
import { CreateRecyclingOrderDto } from './dto/create-recycling-order.dto';

const ADDRESS = {
  id: 1,
  residentId: 1,
  contactName: '张三',
  contactPhone: '13800138000',
  province: '北京',
  city: '北京',
  district: '朝阳',
  detail: '测试路1号',
  buildingInfo: null,
  addressTag: null,
  lat: 39.9042,
  lng: 116.3974,
};

function makeCreatedRow(data: Record<string, unknown>) {
  return {
    id: 1,
    orderNo: 'RCY20260901000001',
    residentId: 1,
    workerId: null,
    itemType: data.itemType ?? '小件类废品',
    estimatedWeight: data.estimatedWeight ?? 10,
    actualWeight: null,
    selectedItems: data.selectedItems ?? null,
    hasElevator: data.hasElevator ?? null,
    carryFloor: data.carryFloor ?? null,
    appointDate: data.appointDate ?? new Date('2026-09-10'),
    appointTimeSlot: data.appointTimeSlot ?? '14:00',
    addressSnapshot: {},
    contactName: '张三',
    contactPhone: '13800138000',
    remark: null,
    source: 'MINIPROGRAM',
    isProxyOrder: false,
    serviceContactName: null,
    serviceContactPhone: null,
    status: 'PENDING_ASSIGN',
    referenceAmount: null,
    finalAmount: null,
    paymentStatus: 'UNPAID',
    paidAt: null,
    gpsLat: null,
    gpsLng: null,
    gpsCheckinAt: null,
    gpsDistance: null,
    gpsRemark: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };
}

function makePrisma(options: { liveItems?: Array<{ id: number; name: string; priceText: string }> } = {}) {
  const tx = {
    resident: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    address: { findUnique: jest.fn().mockResolvedValue(ADDRESS) },
    recyclingItem: {
      findMany: jest.fn().mockResolvedValue(options.liveItems ?? []),
    },
    recyclingOrder: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeCreatedRow(data)),
      ),
    },
    orderStatusLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return {
    $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
    _tx: tx,
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  const svc = new RecyclingOrderService(prisma as any, { transition: jest.fn() } as any, new GeoService());
  return svc;
}

const BASE_DTO: CreateRecyclingOrderDto = {
  residentId: 1,
  serviceItem: '小件类废品',
  estimatedWeight: 10,
  appointDate: '2026-09-10',
  appointTimeSlot: '14:00',
  addressId: 1,
  contactName: '张三',
  contactPhone: '13800138000',
};

describe('RecyclingOrderService — create 回收品项快照', () => {
  it('不传 selectedItems 时仍可下单（旧代下单）', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);

    const dto = await svc.create({ ...BASE_DTO });

    expect(dto.estimatedWeight).toBe(10);
    expect(dto.selectedItems).toBeNull();
    expect(dto.hasElevator).toBeNull();
    expect(dto.carryFloor).toBeNull();
    expect(prisma._tx.recyclingItem.findMany).not.toHaveBeenCalled();
    expect(prisma._tx.recyclingOrder.create).toHaveBeenCalledTimes(1);
  });

  it('selectedItems 为空数组时返回 400', async () => {
    const prisma = makePrisma();
    const svc = makeService(prisma);

    await expect(svc.create({ ...BASE_DTO, selectedItems: [] })).rejects.toThrow(
      new BadRequestException('请选择回收物品'),
    );
    expect(prisma._tx.recyclingOrder.create).not.toHaveBeenCalled();
  });

  it('小件带搬运楼层时入库 carryFloor 为 null', async () => {
    const prisma = makePrisma({
      liveItems: [{ id: 8, name: '纸张', priceText: '0.6元/kg' }],
    });
    const svc = makeService(prisma);

    const dto = await svc.create({
      ...BASE_DTO,
      serviceItem: '小件类废品',
      selectedItems: [{ itemId: 8, name: '旧名', priceText: '旧价', quantity: 1 }],
      hasElevator: false,
      carryFloor: 6,
    });

    expect(prisma._tx.recyclingOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hasElevator: false,
          carryFloor: null,
          selectedItems: [{ itemId: 8, name: '纸张', priceText: '0.6元/kg', quantity: 1 }],
        }),
      }),
    );
    expect(dto.carryFloor).toBeNull();
    expect(dto.hasElevator).toBe(false);
    expect(dto.selectedItems?.[0].name).toBe('纸张');
  });

  it('大件缺少搬运楼层时返回 400', async () => {
    const prisma = makePrisma({
      liveItems: [{ id: 1, name: '单门柜', priceText: '面议' }],
    });
    const svc = makeService(prisma);

    await expect(
      svc.create({
        ...BASE_DTO,
        serviceItem: '大件类废品',
        selectedItems: [{ itemId: 1, name: '单门柜', priceText: '面议', quantity: 2 }],
        hasElevator: true,
      }),
    ).rejects.toThrow(new BadRequestException('请选择搬运楼层'));
    expect(prisma._tx.recyclingOrder.create).not.toHaveBeenCalled();
  });

  it('停用或删除的品项返回 400', async () => {
    const prisma = makePrisma({ liveItems: [] });
    const svc = makeService(prisma);

    await expect(
      svc.create({
        ...BASE_DTO,
        selectedItems: [{ itemId: 99, name: '纸张', priceText: '0.6元/kg', quantity: 1 }],
        hasElevator: true,
      }),
    ).rejects.toThrow(new BadRequestException('请重新选择回收物品'));
  });

  it('详情出参带上 selectedItems / hasElevator / carryFloor', async () => {
    const row = makeCreatedRow({
      itemType: '大件类废品',
      selectedItems: [{ itemId: 1, name: '单门柜', priceText: '面议', quantity: 2 }],
      hasElevator: true,
      carryFloor: 8,
    });
    const prisma = {
      recyclingOrder: { findUnique: jest.fn().mockResolvedValue(row) },
    };
    const svc = makeService(prisma as any);
    const dto = await svc.findOne(1);

    expect(dto.selectedItems).toEqual([
      { itemId: 1, name: '单门柜', priceText: '面议', quantity: 2 },
    ]);
    expect(dto.hasElevator).toBe(true);
    expect(dto.carryFloor).toBe(8);
    expect(dto.estimatedWeight).toBe(10);
  });
});
