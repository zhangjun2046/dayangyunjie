import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BizType, RecyclingItemDto } from '@dayangyunjie/shared';
import { Prisma, RecyclingItem, ServiceCatalog } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRecyclingItemDto } from './dto/create-recycling-item.dto';
import { QueryEnabledRecyclingItemDto, QueryRecyclingItemDto } from './dto/query-recycling-item.dto';
import { UpdateRecyclingItemDto } from './dto/update-recycling-item.dto';

const CATALOG_INCLUDE = { catalog: true } as const;

type RecyclingItemWithCatalog = RecyclingItem & { catalog: ServiceCatalog };

@Injectable()
export class RecyclingItemService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: QueryRecyclingItemDto) {
    const { page = 1, pageSize = 10, catalogId, isEnabled, name } = query;
    const where: Prisma.RecyclingItemWhereInput = {
      ...(isEnabled !== undefined ? { isEnabled } : {}),
      ...(catalogId ? { catalogId } : {}),
      ...(name ? { name: { contains: name } } : {}),
    };

    const [rows, total] = await this.prismaService.$transaction([
      this.prismaService.recyclingItem.findMany({
        where,
        include: CATALOG_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prismaService.recyclingItem.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
    };
  }

  async findEnabled(query: QueryEnabledRecyclingItemDto): Promise<RecyclingItemDto[]> {
    const rows = await this.prismaService.recyclingItem.findMany({
      where: {
        isEnabled: true,
        catalog: {
          isEnabled: true,
          bizType: BizType.RECYCLING,
          ...(query.catalogId ? { id: query.catalogId } : {}),
        },
      },
      include: CATALOG_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: number): Promise<RecyclingItemDto> {
    const row = await this.prismaService.recyclingItem.findUnique({
      where: { id },
      include: CATALOG_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(`RecyclingItem ${id} not found`);
    }
    return this.toDto(row);
  }

  async create(dto: CreateRecyclingItemDto): Promise<RecyclingItemDto> {
    await this.assertRecyclingCatalog(dto.catalogId);
    await this.assertNameUnique(dto.catalogId, dto.name);
    const row = await this.prismaService.recyclingItem.create({
      data: {
        catalogId: dto.catalogId,
        name: dto.name,
        priceText: dto.priceText,
        icon: dto.icon,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: CATALOG_INCLUDE,
    });
    return this.toDto(row);
  }

  async update(id: number, dto: UpdateRecyclingItemDto): Promise<RecyclingItemDto> {
    const existing = await this.prismaService.recyclingItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`RecyclingItem ${id} not found`);
    }

    const nextCatalogId = dto.catalogId ?? existing.catalogId;
    const nextName = dto.name ?? existing.name;
    if (dto.catalogId !== undefined) {
      await this.assertRecyclingCatalog(dto.catalogId);
    }
    if (nextCatalogId !== existing.catalogId || nextName !== existing.name) {
      await this.assertNameUnique(nextCatalogId, nextName, id);
    }

    const row = await this.prismaService.recyclingItem.update({
      where: { id },
      data: {
        ...(dto.catalogId !== undefined ? { catalogId: dto.catalogId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceText !== undefined ? { priceText: dto.priceText } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: CATALOG_INCLUDE,
    });
    return this.toDto(row);
  }

  async remove(id: number): Promise<{ id: number }> {
    await this.assertExists(id);
    await this.prismaService.recyclingItem.delete({ where: { id } });
    return { id };
  }

  async toggle(id: number): Promise<RecyclingItemDto> {
    const row = await this.prismaService.recyclingItem.findUnique({
      where: { id },
      include: CATALOG_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(`RecyclingItem ${id} not found`);
    }
    const updated = await this.prismaService.recyclingItem.update({
      where: { id },
      data: { isEnabled: !row.isEnabled },
      include: CATALOG_INCLUDE,
    });
    return this.toDto(updated);
  }

  private async assertExists(id: number): Promise<void> {
    const count = await this.prismaService.recyclingItem.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`RecyclingItem ${id} not found`);
    }
  }

  private async assertRecyclingCatalog(catalogId: number): Promise<void> {
    const catalog = await this.prismaService.serviceCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog || catalog.bizType !== BizType.RECYCLING) {
      throw new BadRequestException('请选择废品回收下的服务分类');
    }
  }

  private async assertNameUnique(catalogId: number, name: string, excludeId?: number): Promise<void> {
    const dup = await this.prismaService.recyclingItem.findFirst({
      where: {
        catalogId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (dup) {
      throw new BadRequestException('该分类下已存在同名回收品项');
    }
  }

  private toDto(row: RecyclingItemWithCatalog): RecyclingItemDto {
    return {
      id: row.id,
      catalogId: row.catalogId,
      catalogName: row.catalog.name,
      name: row.name,
      priceText: row.priceText,
      icon: row.icon ?? null,
      sortOrder: row.sortOrder,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
